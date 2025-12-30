import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Calendar, User } from 'lucide-react';
import { Link } from 'wouter';
import { Streamdown } from 'streamdown';

export default function ArticleDetail() {
  const params = useParams();
  const slug = params?.slug;

  const { data: article, isLoading } = trpc.articles.getBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">文章不存在</h1>
          <Link href="/blog">
            <Button>返回博客</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/10 to-accent/5 py-8 border-b border-border">
        <div className="container">
          <Link href="/blog">
            <Button variant="ghost" className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回博客
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {article.title}
          </h1>
          <div className="flex items-center gap-6 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString('zh-CN')
                : '未发布'}
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              作者
            </div>
            <div>{article.viewCount} 次浏览</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          {article.coverImage && (
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-96 object-cover rounded-lg mb-8"
            />
          )}

          {article.summary && (
            <div className="bg-card border border-border rounded-lg p-6 mb-8">
              <p className="text-lg text-foreground italic">{article.summary}</p>
            </div>
          )}

          <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            <Streamdown>{article.content}</Streamdown>
          </article>
        </div>
      </div>
    </div>
  );
}
