import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data: stats } = trpc.articles.stats.useQuery();
  const { data: articles } = trpc.articles.list.useQuery({
    limit,
    offset: page * limit,
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">无权访问</h1>
          <p className="text-muted-foreground mb-6">您没有权限访问此页面</p>
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">仪表盘</h1>
          <p className="text-muted-foreground">管理您的博客内容和统计信息</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总文章数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {stats.totalArticles}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  分类数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {stats.categories.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  最近发布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-foreground">
                  {stats.recentArticles.length > 0
                    ? new Date(
                        stats.recentArticles[0].publishedAt || new Date()
                      ).toLocaleDateString('zh-CN')
                    : '无'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Articles Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>文章管理</CardTitle>
              <CardDescription>管理和编辑您的文章</CardDescription>
            </div>
            <Link href="/admin/articles/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新建文章
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!articles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : articles.items.length > 0 ? (
              <div className="space-y-4">
                {articles.items.map((article: any) => (
                  <div
                    key={(article as any).id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {(article as any).title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {(article as any).summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">
                          {(article as any).status === 'published' ? '已发布' : '草稿'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {(article as any).viewCount} 次浏览
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/articles/${(article as any).id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">暂无文章</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
