# Blog content architecture (B3)

## Model
- Blog uses Prisma `Article` / `ArticleI18n`
- Canonical URL: `/{locale}/blog/{slug}`
- Does **not** duplicate DIY, Service, or Service×Location bodies

## Discovery
- Blog index includes **From Our Guides** linking to published DIY + active services
- Articles link to related published services/DIY only

## Corpus distinction
- DIY + ServiceLocation content records remain the 63,963 / 127,926 localized-version basis
- Blog is a separate editorial layer (45 initial posts)
