import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, User, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery({
    limit,
    offset: page * limit,
    categoryId: selectedCategory,
  });

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: stats } = trpc.articles.stats.useQuery();

  const handleCategoryChange = (categoryId: number | undefined) => {
    setSelectedCategory(categoryId);
    setPage(0);
  };

  const totalPages = articles ? Math.ceil(articles.total / limit) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-accent/10 to-accent/5 py-12 md:py-20">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              技术博客
            </h1>
            <p className="text-lg text-muted-foreground">
              深入探讨运维、数据库、编程语言等技术主题，分享最新的行业洞察和最佳实践。
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="py-8 border-b border-border">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent mb-1">
                  {stats.totalArticles}
                </div>
                <div className="text-sm text-muted-foreground">篇文章</div>
              </div>
              {stats.categories.slice(0, 2).map((cat) => (
                <div key={cat.categoryId} className="text-center">
                  <div className="text-3xl font-bold text-accent mb-1">
                    {cat.count}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {cat.categoryName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4">分类</h3>
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory === undefined ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleCategoryChange(undefined)}
                  >
                    全部文章
                  </Button>
                  {categories?.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => handleCategoryChange(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {articlesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : articles && articles.items.length > 0 ? (
              <>
                <div className="space-y-6">
                  {articles.items.map((article: any) => (
                    <Link key={article.id} href={`/article/${article.slug}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-2xl mb-2 text-foreground">
                                {article.title}
                              </CardTitle>
                              <CardDescription className="text-base">
                                {article.summary}
                              </CardDescription>
                            </div>
                            {article.coverImage && (
                              <img
                                src={article.coverImage}
                                alt={article.title}
                                className="w-32 h-32 object-cover rounded-lg"
                              />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {article.publishedAt
                                  ? new Date(article.publishedAt).toLocaleDateString('zh-CN')
                                  : '未发布'}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                作者
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {article.viewCount} 次浏览
                              </Badge>
                              <ArrowRight className="w-4 h-4 text-accent" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <Button
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      第 {page + 1} / {totalPages} 页
                    </div>
                    <Button
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">暂无文章</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
