async function odooRpc(url, service, method, args) {
  const response = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Date.now()
    })
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.data?.message || data.error.message || "Error JSON-RPC en Odoo");
  }
  return data.result;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const { cliente, entrega, metodoPago, items, total } = req.body;
    const { ODOO_URL, ODOO_DB, ODOO_EMAIL, ODOO_API_KEY, HUBSPOT_ACCESS_TOKEN } = process.env;

    // 1. AUTENTICACIÓN EN ODOO ERP
    const uid = await odooRpc(ODOO_URL, "common", "authenticate", [
      ODOO_DB,
      ODOO_EMAIL,
      ODOO_API_KEY,
      {}
    ]);
    if (!uid) throw new Error("No se pudo autenticar con Odoo. Revisa ODOO_API_KEY.");

    // 2. BUSCAR O CREAR CLIENTE EN ODOO (res.partner)
    let partnerIds = await odooRpc(ODOO_URL, "object", "execute_kw", [
      ODOO_DB, uid, ODOO_API_KEY, "res.partner", "search",
      [[["email", "=", cliente.correo]]]
    ]);

    let partnerId = partnerIds[0];
    if (!partnerId) {
      partnerId = await odooRpc(ODOO_URL, "object", "execute_kw", [
        ODOO_DB, uid, ODOO_API_KEY, "res.partner", "create",
        [{ name: cliente.nombre, email: cliente.correo, phone: cliente.telefono }]
      ]);
    }

    // 3. MAPEAR PRODUCTOS POR SKU Y CREAR ORDEN DE VENTA (sale.order)
    const orderLines = [];
    for (const item of items) {
      const prodIds = await odooRpc(ODOO_URL, "object", "execute_kw", [
        ODOO_DB, uid, ODOO_API_KEY, "product.product", "search",
        [[["default_code", "=", item.sku]]]
      ]);
      if (prodIds.length > 0) {
        orderLines.push([0, 0, {
          product_id: prodIds[0],
          product_uom_qty: item.cantidad,
          price_unit: item.precio
        }]);
      }
    }

    const saleOrderId = await odooRpc(ODOO_URL, "object", "execute_kw", [
      ODOO_DB, uid, ODOO_API_KEY, "sale.order", "create",
      [{
        partner_id: partnerId,
        note: `Entrega: ${entrega} | Pago: ${metodoPago}`,
        order_line: orderLines
      }]
    ]);

    // Confirmar orden y validar entrega para descontar inventario "A la mano"
    await odooRpc(ODOO_URL, "object", "execute_kw", [
      ODOO_DB, uid, ODOO_API_KEY, "sale.order", "action_confirm",
      [[saleOrderId]]
    ]);

    try {
      const [orderData] = await odooRpc(ODOO_URL, "object", "execute_kw", [
        ODOO_DB, uid, ODOO_API_KEY, "sale.order", "read",
        [[saleOrderId], ["picking_ids"]]
      ]);
      if (orderData?.picking_ids?.length > 0) {
        await odooRpc(ODOO_URL, "object", "execute_kw", [
          ODOO_DB, uid, ODOO_API_KEY, "stock.picking", "button_validate",
          [orderData.picking_ids]
        ]);
      }
    } catch (_) {
      // Si Odoo requiere validación manual del albarán, el pedido ya quedó confirmado y reservado
    }

    // 4. REGISTRAR CONTACTO Y NEGOCIO EN HUBSPOT CRM
    const hsHeaders = {
      "Authorization": `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    };

    let contactId = null;
    const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: hsHeaders,
      body: JSON.stringify({
        properties: {
          firstname: cliente.nombre,
          email: cliente.correo,
          phone: cliente.telefono,
          hs_lead_status: "CONNECTED"
        }
      })
    });
    const contactData = await contactRes.json();

    if (contactRes.ok) {
      contactId = contactData.id;
    } else if (contactRes.status === 409 && contactData.message) {
      const match = contactData.message.match(/Existing ID:\s*(\d+)/);
      if (match) contactId = match[1];
    }

    const dealRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
      method: "POST",
      headers: hsHeaders,
      body: JSON.stringify({
        properties: {
          dealname: `Pedido Web #${saleOrderId} - ${cliente.nombre}`,
          pipeline: "default",
          dealstage: "closedwon",
          amount: String(total)
        }
      })
    });
    const dealData = await dealRes.json();
    const dealId = dealData.id || "registrado";

    if (contactId && dealData.id) {
      await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealData.id}/associations/contacts/${contactId}/3`, {
        method: "PUT",
        headers: hsHeaders
      }).catch(() => {});
    }

    return res.status(200).json({
      ok: true,
      odooOrderId: saleOrderId,
      hubspotDealId: dealId
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};
