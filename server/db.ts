import { eq, desc, asc, inArray, count, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, articles, categories, tags, articleTags } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Article queries
export async function getArticles({
  limit = 10,
  offset = 0,
  categoryId,
  status = 'published',
  tagId,
}: {
  limit?: number;
  offset?: number;
  categoryId?: number;
  status?: 'draft' | 'published';
  tagId?: number;
} = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (categoryId) {
    conditions.push(eq(articles.categoryId, categoryId));
  }
  if (status) {
    conditions.push(eq(articles.status, status));
  }

  if (tagId) {
    // Join with article_tags to filter by tag
    const articlesWithTag = await db
      .select({ articleId: articleTags.articleId })
      .from(articleTags)
      .where(eq(articleTags.tagId, tagId));
    const articleIds = articlesWithTag.map(at => at.articleId);
    if (articleIds.length === 0) return [];
    conditions.push(inArray(articles.id, articleIds));
  }

  let query = db.select().from(articles) as any;
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = await query
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);

  return result;
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getArticleCount(categoryId?: number, status: 'draft' | 'published' = 'published') {
  const db = await getDb();
  if (!db) return 0;

  const conditions: any[] = [];
  if (categoryId) {
    conditions.push(eq(articles.categoryId, categoryId));
  }
  if (status) {
    conditions.push(eq(articles.status, status));
  }

  let query = db.select({ count: count() }).from(articles);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query;
  return result[0]?.count || 0;
}

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getTags() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function getTagById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(tags)
    .where(eq(tags.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getArticleTags(articleId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(articleTags)
    .where(eq(articleTags.articleId, articleId));
}

export async function getArticleStats() {
  const db = await getDb();
  if (!db) return { totalArticles: 0, categories: [], recentArticles: [] };

  const totalArticles = await getArticleCount(undefined, 'published');
  const categoryStats = await db
    .select({
      categoryId: articles.categoryId,
      categoryName: categories.name,
      count: count(),
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.status, 'published'))
    .groupBy(articles.categoryId);

  const recentArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(5);

  return { totalArticles, categories: categoryStats, recentArticles };
}
