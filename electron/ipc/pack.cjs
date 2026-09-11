const { ipcMain } = require('electron');
const PrintRenderer = require('../print/render.cjs');

function registerPackIPC(db, syncEngine) {
  const renderer = new PrintRenderer(db);

  ipcMain.handle('pack:lookup', async (_e, code) => {
    const order = db.pack.findOrderByScan(code);
    if (!order) return { found: false, code };

    const session = db.pack.startSession(order.id, db.getSetting('packer_name'));
    const full = db.orders.getById(order.id);

    return {
      found: true,
      order: full,
      session,
      checklist: db.pack.getChecklist(order.id, session.id),
      alreadyFulfilled: order.fulfillment === 'fulfilled'
    };
  });

  ipcMain.handle('pack:scan', async (_e, { sessionId, code }) =>
    db.pack.scanItem(sessionId, code)
  );

  ipcMain.handle('pack:finish', async (_e, { sessionId, orderId, print = {}, fulfill = true, isPartial = false, packedItems = [], customerNote = '' }) => {
    const session = db.pack.finishSession(sessionId, { notes: customerNote || (isPartial ? 'Partial fulfillment' : 'Complete fulfillment') });
    const order = db.orders.getById(orderId);
    const outputs = [];

    // Print first: if the printer jams, the merchant would rather the order
    // still be marked unfulfilled than have a fulfilment with no label.
    if (print.packingSlip) {
      outputs.push(await renderer.directPrint({
        kind: 'packing_slip',
        data: { orders: [order], isPartial, packedItems },
        options: { isThermal: print.thermal !== false, deviceName: print.slipPrinter }
      }));
    }

    if (print.label) {
      outputs.push(await renderer.directPrint({
        kind: 'label',
        data: { order },
        options: {
          deviceName: print.labelPrinter,
          trackingNumber: print.trackingNumber || '',
          trackingCompany: print.trackingCompany || ''
        }
      }));
    }

    const targetFulfillment = isPartial ? 'partial' : 'fulfilled';

    if (fulfill) {
      db.outbox.enqueue(
        order.store_id,
        'fulfill_order',
        JSON.stringify({
          order_id: order.id,
          orderId: order.id,
          remote_id: order.remote_id,
          remoteOrderId: order.remote_id,
          tracking_number: print.trackingNumber || null,
          trackingNumber: print.trackingNumber || null,
          tracking_company: print.trackingCompany || null,
          trackingCompany: print.trackingCompany || null,
          notify_customer: print.notifyCustomer !== false,
          notifyCustomer: print.notifyCustomer !== false,
          is_partial: Boolean(isPartial),
          isPartial: Boolean(isPartial),
          packed_items: packedItems,
          packedItems: packedItems,
          note: customerNote || ''
        })
      );

      // Optimistic local state so the packer sees it move immediately.
      db.orders.updateLocalStatus(order.id, { 
        fulfillment: targetFulfillment,
        ...(customerNote ? { note: customerNote } : {})
      });
      if (syncEngine) syncEngine.outboxWorker.processQueue().catch(() => {});
    }

    return { success: true, session, fulfillment: targetFulfillment, printed: outputs.length };
  });

  ipcMain.handle('pack:createSample', async (_e) => {
    const order = db.pack.createSampleOrder();
    if (!order) throw new Error('Could not create demo order');

    const session = db.pack.startSession(order.id, db.getSetting('packer_name', 'Default Packer'));
    const full = db.orders.getById(order.id);

    return {
      found: true,
      order: full,
      session,
      checklist: db.pack.getChecklist(order.id, session.id),
      alreadyFulfilled: false
    };
  });

  ipcMain.handle('pack:queue', async (_e, opts) => db.pack.getUnfulfilledQueue(opts || {}));

  ipcMain.handle('pack:manualPack', async (_e, { sessionId, itemId }) =>
    db.pack.manualPackItem(sessionId, itemId)
  );

  ipcMain.handle('pack:abandon', async (_e, sessionId) => {
    db.pack.abandonSession(sessionId);
    return { success: true };
  });

  ipcMain.handle('pack:stats', async (_e, opts) => db.pack.getStats(opts || {}));
  ipcMain.handle('pack:problems', async (_e, opts) => db.pack.getProblemScans(opts || {}));

  /** Next unfulfilled order — lets a packer work the queue without a picking list. */
  ipcMain.handle('pack:next', async () => {
    const res = db.orders.list({
      fulfillment: 'unfulfilled',
      limit: 1,
      sort: 'placed_at ASC'
    });
    if (res.orders && res.orders.length > 0) return res.orders[0];
    
    // Check partial if no unfulfilled
    const partialRes = db.orders.list({
      fulfillment: 'partial',
      limit: 1,
      sort: 'placed_at ASC'
    });
    return partialRes.orders[0] || null;
  });
}

module.exports = { registerPackIPC };
