import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Zap, Shield } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-accent">技术博客</div>
          <div className="flex items-center gap-4">
            <Link href="/blog">
              <Button variant="ghost">博客</Button>
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button>仪表盘</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button>登录</Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-accent/20 to-accent/5 py-20 md:py-32">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              深入技术世界
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              探讨运维、数据库、编程语言等技术主题。从实战经验到最佳实践，
              我们分享最新的行业洞察和深度技术文章。
            </p>
            <Link href="/blog">
              <Button size="lg" className="gap-2">
                开始阅读 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-b border-border">
        <div className="container">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            为什么选择我们
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-accent/10 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                深度内容
              </h3>
              <p className="text-muted-foreground">
                每篇文章都经过精心撰写，涵盖实战案例和最佳实践。
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                最新技术
              </h3>
              <p className="text-muted-foreground">
                紧跟技术发展，分享最新的版本更新和功能特性。
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                可靠性
              </h3>
              <p className="text-muted-foreground">
                所有内容都经过验证，确保准确性和实用性。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            准备好开始了吗？
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            浏览我们的文章库，找到适合您的技术内容。
          </p>
          <Link href="/blog">
            <Button size="lg">浏览所有文章</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-8">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 技术博客. 保留所有权利。</p>
        </div>
      </footer>
    </div>
  );
}
