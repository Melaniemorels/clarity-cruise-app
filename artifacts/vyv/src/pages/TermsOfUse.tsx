import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TermsOfUse = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.language?.startsWith("es") ? "es" : "en";

  const toggleLanguage = () => {
    i18n.changeLanguage(language === "es" ? "en" : "es");
  };

  const spanishContent = {
    title: "TÉRMINOS DE USO",
    subtitle: "VYV (Visualize Your Vibe)",
    sections: [
      {
        heading: "1. Aceptación de los términos",
        content: `Al crear una cuenta o usar VYV, aceptás cumplir con estos Términos de Uso. Si no estás de acuerdo, no utilices la app.`
      },
      {
        heading: "2. Descripción del servicio",
        content: `VYV ofrece una plataforma que integra bienestar, productividad y comunidad. Podés registrar hábitos, compartir fotos, reflexiones y conectar con otros usuarios.
La app puede usarse en cualquier idioma compatible con el dispositivo del usuario.`
      },
      {
        heading: "3. Responsabilidad del usuario",
        content: `• No publiques contenido ofensivo, ilegal o que infrinja derechos de terceros.

• Eres responsable de la información que compartes y de mantener tu cuenta segura.

• No uses la app con fines comerciales sin autorización.`
      },
      {
        heading: "4. Contenido del usuario",
        content: `• Mantienes los derechos sobre tu contenido, pero otorgas a VYV una licencia limitada para mostrarlo dentro de la app.

• Podemos eliminar contenido que viole estos términos.`
      },
      {
        heading: "5. Propiedad intelectual",
        content: `• Todos los derechos de marca, logotipo, diseño e interfaz pertenecen a Visualize Your Vibe LLC.

• No se permite copiar o redistribuir el código o los elementos visuales sin permiso.`
      },
      {
        heading: "6. Limitación de responsabilidad",
        content: `• La app se ofrece "tal cual". No garantizamos disponibilidad continua ni ausencia total de errores.

• No somos responsables por daños derivados del mal uso de la app.`
      },
      {
        heading: "7. Cancelación de cuenta",
        content: `Podés eliminar tu cuenta en cualquier momento. También podremos suspender cuentas que incumplan los términos.`
      },
      {
        heading: "8. Cambios en los términos",
        content: `Podremos actualizar estos Términos. Notificaremos cualquier cambio relevante.`
      },
      {
        heading: "9. Contacto",
        content: `Email: support@vyvapp.com

Dirección: San Diego, California, EE.UU.`
      }
    ]
  };

  const englishContent = {
    title: "TERMS OF USE",
    subtitle: "VYV (Visualize Your Vibe)",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        content: `By creating an account or using VYV, you agree to comply with these Terms of Use. If you disagree, do not use the app.`
      },
      {
        heading: "2. Service Description",
        content: `VYV offers a platform that integrates wellness, productivity, and community. You can track habits, share photos, reflections, and connect with other users.
The app can be used in any language supported by the user's device.`
      },
      {
        heading: "3. User Responsibility",
        content: `• Do not post offensive, illegal, or third-party rights-infringing content.

• You are responsible for the information you share and keeping your account secure.

• Do not use the app for commercial purposes without authorization.`
      },
      {
        heading: "4. User Content",
        content: `• You retain rights to your content but grant VYV a limited license to display it within the app.

• We may remove content that violates these terms.`
      },
      {
        heading: "5. Intellectual Property",
        content: `• All trademark, logo, design, and interface rights belong to Visualize Your Vibe LLC.

• Copying or redistributing code or visual elements without permission is not allowed.`
      },
      {
        heading: "6. Limitation of Liability",
        content: `• The app is provided "as is". We do not guarantee continuous availability or complete absence of errors.

• We are not responsible for damages resulting from misuse of the app.`
      },
      {
        heading: "7. Account Cancellation",
        content: `You can delete your account at any time. We may also suspend accounts that violate the terms.`
      },
      {
        heading: "8. Changes to Terms",
        content: `We may update these Terms. We will notify you of any relevant changes.`
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
              onClick={toggleLanguage}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === "es" ? t("legal.switchToEnglish") : t("legal.switchToSpanish")}
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
              <p>{t("legal.lastUpdated")}</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TermsOfUse;
