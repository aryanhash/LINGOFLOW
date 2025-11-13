import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoIcon, MessageSquare, FileText, CheckCircle2, ArrowRight, Zap, Globe, Shield } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

export default function Home() {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: VideoIcon,
      title: t("home.features.videoTranscription.title"),
      description: t("home.features.videoTranscription.description"),
      href: "/transcription",
    },
    {
      icon: MessageSquare,
      title: t("home.features.chat.title"),
      description: t("home.features.chat.description"),
      href: "/chat",
    },
    {
      icon: FileText,
      title: t("home.features.documentTranslation.title"),
      description: t("home.features.documentTranslation.description"),
      href: "/pdf",
    },
  ];

  const steps = [
    {
      number: t("home.howItWorks.step1.number"),
      title: t("home.howItWorks.step1.title"),
      description: t("home.howItWorks.step1.description"),
      icon: Zap,
    },
    {
      number: t("home.howItWorks.step2.number"),
      title: t("home.howItWorks.step2.title"),
      description: t("home.howItWorks.step2.description"),
      icon: Globe,
    },
    {
      number: t("home.howItWorks.step3.number"),
      title: t("home.howItWorks.step3.title"),
      description: t("home.howItWorks.step3.description"),
      icon: CheckCircle2,
    },
  ];

  const stats = [
    { value: "100+", label: t("home.stats.languages") },
    { value: "1M+", label: t("home.stats.translations") },
    { value: "99.9%", label: t("home.stats.uptime") },
    { value: "24/7", label: t("home.stats.support") },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24" style={{ minHeight: "80vh" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                {t("home.hero.title")}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                {t("home.hero.subtitle")}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <Link href="/login">
                    {t("home.hero.ctaPrimary")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-hero-secondary">
                  <Link href="#features">{t("home.hero.ctaSecondary")}</Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>{t("home.hero.trustedBy")}</span>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="aspect-video rounded-xl border bg-card p-8 shadow-lg">
                  <div className="space-y-4">
                    <div className="h-12 bg-primary/10 rounded-lg animate-pulse" />
                    <div className="h-8 bg-muted rounded-lg w-3/4 animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <div className="h-8 bg-muted rounded-lg w-5/6 animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <div className="h-8 bg-muted rounded-lg w-2/3 animate-pulse" style={{ animationDelay: "0.6s" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">{t("home.features.sectionTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("home.features.sectionSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href}>
                <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer transition-transform h-full" data-testid={`card-feature-${index}`}>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{feature.description}</p>
                  <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    {t("home.features.tryNow")} <ArrowRight className="h-4 w-4" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">{t("home.howItWorks.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("home.howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative" data-testid={`step-${index}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-sm font-mono text-muted-foreground mb-2">{step.number}</div>
                  <h3 className="text-lg font-medium mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center" data-testid={`stat-${index}`}>
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-12 border">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              {t("home.cta.title")}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("home.cta.subtitle")}
            </p>
            <Button size="lg" asChild data-testid="button-cta">
              <Link href="/transcription">
                {t("home.cta.button")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-medium mb-4">{t("home.footer.company.title")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t("home.footer.company.about")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("home.footer.company.blog")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("home.footer.company.careers")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">{t("home.footer.features.title")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/transcription" className="hover:text-foreground">{t("home.footer.features.transcription")}</Link></li>
                <li><Link href="/dubbing" className="hover:text-foreground">{t("home.footer.features.dubbing")}</Link></li>
                <li><Link href="/chat" className="hover:text-foreground">{t("home.footer.features.chat")}</Link></li>
                <li><Link href="/pdf" className="hover:text-foreground">{t("home.footer.features.documentTranslation")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">{t("home.footer.resources.title")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t("home.footer.resources.documentation")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("home.footer.resources.apiReference")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("home.footer.resources.support")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">{t("home.footer.legal.title")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">{t("home.footer.legal.privacy")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("home.footer.legal.terms")}</a></li>
                <li><a href="#" className="hover:text-foreground">{t("home.footer.legal.security")}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            {t("home.footer.copyright")}
          </div>
        </div>
      </footer>
    </div>
  );
}
