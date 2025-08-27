// Import Express.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configs
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const rasaURL = process.env.RASA_URL || 'http://localhost:5005/webhooks/rest/webhook';
const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// GET: Verificación de Webhook
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// POST: Mensajes entrantes de WhatsApp
app.post('/', async (req, res) => {
  const body = req.body;

  console.log("📩 Webhook recibido:");
  console.log(JSON.stringify(body, null, 2));

  if (body.object) {
    try {
      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const sender = message?.from;
      const text = message?.text?.body;

      if (sender && text) {
        console.log(`👉 Mensaje de ${sender}: ${text}`);

        // 1. Enviar mensaje a Rasa
        const rasaResponse = await axios.post(rasaURL, {
          sender: sender,
          message: text
        });

        // 2. Procesar respuesta de Rasa
        for (const msg of rasaResponse.data) {
          if (msg.text) {
            await axios.post(
              `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
              {
                messaging_product: "whatsapp",
                to: sender,
                text: { body: msg.text }
              },
              {
                headers: {
                  "Authorization": `Bearer ${whatsappToken}`,
                  "Content-Type": "application/json"
                }
              }
            );
          }
        }
      }
    } catch (err) {
      console.error("❌ Error procesando mensaje:", err.response?.data || err.message);
    }
  }

  res.sendStatus(200);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
