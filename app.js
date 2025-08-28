// Import Express.js y Axios
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuraciones
const port = process.env.PORT || 3000;
const verifyToken = "787052530498023";
const rasaURL = "https://c38e2da57b77.ngrok-free.app/webhooks/rest/webhook";
const whatsappToken = "EAASx3p5EdCMBPXpEAFBVFKKhthJFJ0qIUmY0EPx3vwJN2vi0NeZAvjadVwMdZAyfL0qNFIbV8ZCgYOapHxYZAmiB4dQAiaJ5CBTAQKoMAhN60Rv0G9i0MpsjlEy7b1Ki45gqAGFnBrJDAbvO9SuF2LB8yjqTG7RW6HZAmHQiyQtF1nTcUhIZBZAeSObH4hMnCb9w5hQiXc82ZCCD074DVoFIFLRYylZBILU5d1TKmyghzKd0vDiawTA0P831bwZDZD";
const phoneNumberId = "819298601257509";

// GET: Verificación del Webhook
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO');
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

        // Enviar mensaje a Rasa
        const rasaResponse = await axios.post(rasaURL, { sender, message: text });
        console.log("💡 Respuesta de Rasa:", JSON.stringify(rasaResponse.data, null, 2));

        const messages = Array.isArray(rasaResponse.data) ? rasaResponse.data : [];

        // Fallback si Rasa no devuelve text
        if (messages.length === 0 || !messages.some(m => m.text)) {
          console.log("⚠️ Rasa no devolvió texto, enviando fallback...");
          await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
              messaging_product: "whatsapp",
              to: sender,
              text: { body: "Estamos procesando tu solicitud..." }
            },
            {
              headers: {
                "Authorization": `Bearer ${whatsappToken}`,
                "Content-Type": "application/json"
              }
            }
          );
        }

        // Enviar todos los mensajes que tengan 'text'
        for (const msg of messages) {
          if (msg.text) {
            console.log(`💬 Respondiendo a ${sender}: ${msg.text}`);
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
      console.error("❌ Error procesando mensaje:", err);
      if (err.response) {
        console.error("Detalles de la respuesta de Axios:", err.response.data);
      }
    }
  }

  // Siempre respondemos 200 a WhatsApp
  res.sendStatus(200);
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});
