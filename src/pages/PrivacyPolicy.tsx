import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const [language, setLanguage] = useState<"es" | "en">("es");
  const navigate = useNavigate();

  const spanishContent = {
    title: "POLÍTICA DE PRIVACIDAD",
    subtitle: "VYV (Visualize Your Vibe)",
    sections: [
      {
        heading: "1. Introducción",
        content: `Bienvenida a VYV ("nosotros", "nuestro/a"). En VYV te ayudamos a mejorar tu bienestar y productividad personal. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos la información que obtengamos a través de la app, incluidas las fotos, publicaciones y la interacción social entre usuarios. Al usar VYV, aceptas que la información se procese según lo descrito aquí.`
      },
      {
        heading: "2. Información que recopilamos",
        content: `• Datos que tú proporcionas (nombre, correo electrónico, foto de perfil, publicaciones, imágenes, videos, comentarios).

• Datos generados por el uso de la app (actividad, horarios, interacciones, estadísticas).

• Datos técnicos (IP, tipo de dispositivo, sistema operativo).

• Si decides conectar wearables o apps de salud, se podrán leer datos como pasos o tiempo de sueño.`
      },
      {
        heading: "3. Cómo usamos tu información",
        content: `• Para permitir publicaciones, comentarios y visualización de contenido.

• Personalizar la experiencia del usuario.

• Analizar el uso de la app para mejorarla.

• Cumplir obligaciones legales o prevenir abusos.`
      },
      {
        heading: "4. Compartir información",
        content: `• No vendemos información personal a terceros.

• Los contenidos públicos (fotos, publicaciones) podrán verse según la configuración de privacidad que elijas.

• Podemos compartir información agregada (sin identificarte) con fines estadísticos o de mejora.`
      },
      {
        heading: "5. Tus derechos y control",
        content: `• Puedes decidir qué contenido haces público o privado.

• Puedes editar o eliminar tu perfil o publicaciones.

• Puedes revocar permisos (ubicación, cámara, notificaciones) desde la configuración.`
      },
      {
        heading: "6. Seguridad y retención de datos",
        content: `• Protegemos tus datos con medidas técnicas y organizativas adecuadas.

• Conservamos la información solo mientras sea necesaria para los fines descritos.`
      },
      {
        heading: "7. Menores de edad",
        content: `Si tienes menos de 13 años (o la edad mínima legal de tu país), se requiere consentimiento parental.`
      },
      {
        heading: "8. Cambios",
        content: `Podremos actualizar esta Política ocasionalmente. Te notificaremos sobre cambios importantes.`
      },
      {
        heading: "9. Contacto",
        content: `Email: support@vyvapp.com

Dirección: San Diego, California, EE.UU.`
      }
    ]
  };

  const englishContent = {
    title: "PRIVACY POLICY",
    subtitle: "VYV (Visualize Your Vibe)",
    sections: [
      {
        heading: "1. Introduction",
        content: `Welcome to VYV ("we", "our"). VYV helps you improve wellness and personal productivity. This Privacy Policy explains how we collect, use, share, and protect information obtained through the app, including photos, posts, and user interactions. By using VYV, you agree to this policy.`
      },
      {
        heading: "2. Information We Collect",
        content: `• Data you provide (name, email, profile picture, posts, photos, videos, comments).

• App usage data (activity, times, interactions, statistics).

• Technical data (IP address, device type, operating system).

• If you connect wearables or health apps, basic wellness data like steps or sleep may be accessed.`
      },
      {
        heading: "3. How We Use Your Information",
        content: `• To enable posting, commenting, and sharing.

• To personalize user experience.

• To analyze app usage for improvement.

• To comply with legal requirements and prevent misuse.`
      },
      {
        heading: "4. Sharing Information",
        content: `• We do not sell personal information.

• Public posts and photos can be seen based on your visibility settings.

• We may share aggregated (non-identifiable) data for analytics or improvement.`
      },
      {
        heading: "5. Your Rights and Control",
        content: `• You control what content is public or private.

• You can edit or delete your profile or posts anytime.

• You can revoke permissions (location, camera, notifications) from settings.`
      },
      {
        heading: "6. Data Security & Retention",
        content: `• We implement technical and organizational measures to protect your data.

• Data is retained only as long as necessary for the described purposes.`
      },
      {
        heading: "7. Minors",
        content: `Users under 13 (or local legal age) require parental consent.`
      },
      {
        heading: "8. Changes",
        content: `We may update this Policy occasionally and notify users of significant changes.`
      },
      {
        heading: "9. Contact",
        content: `Email: support@vyvapp.com

Address: San Diego, California, USA`
      }
    ]
  };

  const content = language === "es" ? spanishContent : englishContent;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === "es" ? "English" : "Español"}
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-73px)]">
          <div className="px-6 py-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-luxury-navy mb-2">
                {content.title}
              </h1>
              <p className="text-lg text-muted-foreground">{content.subtitle}</p>
            </div>

            <div className="space-y-8">
              {content.sections.map((section, index) => (
                <section key={index} className="space-y-3">
                  <h2 className="text-xl font-semibold text-luxury-navy">
                    {section.heading}
                  </h2>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </section>
              ))}
            </div>

            <div className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground">
              <p>{language === "es" ? "Última actualización: 2025" : "Last updated: 2025"}</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
