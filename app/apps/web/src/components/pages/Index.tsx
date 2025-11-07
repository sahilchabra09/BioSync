import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Activity, Target, Zap, Brain, TrendingUp } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Eye,
      title: "Eye Tracking",
      description: "Real-time eye movement detection and analysis",
      color: "from-cyan-500 to-blue-500"
    },
    {
      icon: Activity,
      title: "Live Monitoring",
      description: "Monitor attention patterns and focus metrics",
      color: "from-blue-500 to-purple-500"
    },
    {
      icon: Target,
      title: "Precision Analysis",
      description: "High-accuracy gaze point detection",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description: "Ultra-low latency tracking performance",
      color: "from-pink-500 to-red-500"
    },
    {
      icon: Brain,
      title: "AI Insights",
      description: "Machine learning powered behavior analysis",
      color: "from-red-500 to-orange-500"
    },
    {
      icon: TrendingUp,
      title: "Analytics",
      description: "Comprehensive data visualization and reports",
      color: "from-orange-500 to-yellow-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
            Eye Tracker Pro
          </h1>
          <p className="text-xl text-muted-foreground">
            Next-Generation Eye Tracking Technology
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="group relative overflow-hidden border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 glow-effect cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <CardHeader className="space-y-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="text-base text-muted-foreground group-hover:text-foreground transition-colors">
                    {feature.description}
                  </CardDescription>
                </CardContent>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </Card>
            );
          })}
        </div>

        <footer className="mt-16 text-center text-muted-foreground">
          <p className="text-sm">Built for Hackathon 2025 • Powered by Advanced AI</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
