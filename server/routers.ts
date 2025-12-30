import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { getArticles, getArticleById, getArticleBySlug, getArticleCount, getArticleStats, getCategories, getCategoryById, getTags, getTagById } from "./db";
import { articles, articleTags } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  articles: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
        categoryId: z.number().optional(),
        tagId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const items = await getArticles({
          limit: input.limit,
          offset: input.offset,
          categoryId: input.categoryId,
          tagId: input.tagId,
          status: 'published',
        });
        const total = await getArticleCount(input.categoryId, 'published');
        return { items, total };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getArticleById(input.id);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getArticleBySlug(input.slug);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string(),
        summary: z.string().optional(),
        content: z.string(),
        categoryId: z.number(),
        status: z.enum(['draft', 'published']).default('draft'),
        tagIds: z.array(z.number()).default([]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const result = await db.insert(articles).values({
          ...input,
          authorId: ctx.user.id,
          publishedAt: input.status === 'published' ? new Date() : null,
        }) as any;

        const articleId = Number(result.insertId);

        // Insert article tags
        if (input.tagIds.length > 0) {
          await db.insert(articleTags).values(
            input.tagIds.map(tagId => ({ articleId, tagId }))
          );
        }

        return { id: articleId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        slug: z.string().optional(),
        summary: z.string().optional(),
        content: z.string().optional(),
        categoryId: z.number().optional(),
        status: z.enum(['draft', 'published']).optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const article = await getArticleById(input.id);
        if (!article) throw new TRPCError({ code: 'NOT_FOUND' });

        const updateData: any = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.slug !== undefined) updateData.slug = input.slug;
        if (input.summary !== undefined) updateData.summary = input.summary;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
        if (input.status !== undefined) {
          updateData.status = input.status;
          if (input.status === 'published' && !article.publishedAt) {
            updateData.publishedAt = new Date();
          }
        }

        await db.update(articles).set(updateData).where(eq(articles.id, input.id));

        // Update tags if provided
        if (input.tagIds !== undefined) {
          await (db.delete(articleTags).where(eq(articleTags.articleId, input.id)) as any);
          if (input.tagIds.length > 0) {
            await (db.insert(articleTags).values(
              input.tagIds.map(tagId => ({ articleId: input.id, tagId }))
            ) as any);
          }
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        await db.delete(articleTags).where(eq(articleTags.articleId, input.id));
        await db.delete(articles).where(eq(articles.id, input.id));

        return { success: true };
      }),

    stats: publicProcedure.query(async () => {
      return getArticleStats();
    }),
  }),

  categories: router({
    list: publicProcedure.query(async () => {
      return getCategories();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCategoryById(input.id);
      }),
  }),

  tags: router({
    list: publicProcedure.query(async () => {
      return getTags();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getTagById(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
