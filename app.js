// Import Express.js
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configs
const port = process.env.PORT || 3000;
const verifyToken = "787052530498023";
const RASA_URL = process.env.RASA_URL || "https://7f5f19b849a6.ngrok-fr";
axios.post(`${RASA_URL}/webhooks/rest/webhook`, { sender: from, message: body });
const whatsappToken = "EAASx3p5EdCMBPXpEAFBVFKKhthJFJ0qIUmY0EPx3vwJN2vi0NeZAvjadVwMdZAyfL0qNFIbV8ZCgYOapHxYZAmiB4dQAiaJ5CBTAQKoMAhN60Rv0G9i0mMpsjlEy7b1Ki45gqAGFnBrJDAbvO9SuF2LB8yjqTG7RW6HZAmHQiyQtF1nTcUhIZBZAeSObH4hMnCb9w5hQiXc82ZCCD074DVoFIFLRYylZBILU5d1TKmyghzKd0vDiawTA0P831bwZDZD";
const phoneNumberId = "819298601257509";

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
