// Import Express.js y Axios
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuraciones
const port = process.env.PORT || 3000;
const verifyToken = "787052530498023";
const rasaURL = "https://c38e2da57b77.ngrok-free.app/webhooks/rest/webhook";
const whatsappToken = "EAASx3p5EdCMBPfrlynILFi5tjVM9PymxKr7IfWuG6T6ZB9sYuQZCTOVEnGMZBZBAzE5pVra2qQjvZCIQdg1wA2oyzIc3lvA2ZA9XIXpeuTl8QKZA3HDEhFxICiFLyrKVEmSkNbPnJyaVLTE5ZBVMSI6I4AMRzwh2BpKQ7Mid69ZBNfab6AxsqFstTVGMfvpYmpsQBV9IEvwyjRnZBXxfGbYxRy2M4u5ndIXPZCDoQk4Q6oVLq9FeyTJ8qKAfctbkWoZD";
const phoneNumberId = "819298601257509";

// 👉 Función para enviar un CTA a WhatsApp
async function sendWhatsAppCTA(to, headerText, bodyText, buttonText, buttonUrl, footerText) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "interactive",
        interactive: {
          type: "cta_url",
          header: {
            type: "text",
            text: headerText
          },
          body: {
            text: bodyText
          },
          footer: {
            text: footerText
          },
          action: {
            name: "cta_url",
            parameters: {
              display_text: buttonText,
              url: buttonUrl
            }
          }
        }
      },
      {
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ CTA enviado a ${to}`);
  } catch (err) {
    console.error("❌ Error enviando CTA:", err.response?.data || err.message);
  }
}

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

        // ⚡️ Ejemplo: Si Rasa manda un intent especial, mandamos el CTA
        if (messages.some(m => m.custom?.type === "show_cta")) {
          const cta = messages.find(m => m.custom?.type === "show_cta").custom;
          await sendWhatsAppCTA(
            sender,
            cta.header || "Tu cotización está lista",
            cta.body || "Encontramos repuestos para tu vehículo",
            cta.buttonText || "Ver productos",
            cta.url || "https://tu-tienda.com",
            cta.footer || "Gracias por usar nuestro bot 🙌"
          );
        }

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
