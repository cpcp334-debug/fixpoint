import { getTranslations } from "next-intl/server";
import { getApprovedQuestions } from "@/lib/questions";
import { getApprovedServiceReviews, summarizeApprovedServiceReviews, toPublicReview } from "@/lib/reviews";
import { QuestionForm } from "@/components/forms/QuestionForm";
import { QaList } from "@/components/trust/QaList";
import { ReviewForm } from "@/components/trust/ReviewForm";
import { ReviewList } from "@/components/trust/ReviewList";
import { ReviewSummary } from "@/components/trust/ReviewSummary";

export async function ServiceTrustBlock({
  locale,
  serviceId,
  locationId,
  serviceSlug,
  locationSlug,
}: {
  locale: string;
  serviceId?: string;
  locationId?: string;
  serviceSlug?: string;
  locationSlug?: string;
}) {
  const t = await getTranslations("Trust");
  const [summary, rows, questions] = await Promise.all([
    summarizeApprovedServiceReviews({ serviceId, locationId }),
    getApprovedServiceReviews({ serviceId, locationId }),
    getApprovedQuestions({ serviceId, locationId }),
  ]);
  const reviews = rows.map((row) => toPublicReview(row, locale));

  return (
    <div className="mt-10 grid gap-10">
      <section className="rounded-[16px] border border-line/80 bg-white p-5 sm:p-6">
        <ReviewSummary
          count={summary.count}
          average={summary.average}
          labels={{
            title: t("reviewsTitle"),
            empty: t("reviewsEmpty"),
            basedOn: t("basedOn", { count: summary.count }),
          }}
        />
        <ReviewList
          reviews={reviews}
          labels={{
            verified: t("verified"),
            response: t("response"),
            helpful: t("helpful"),
            report: t("report"),
            thanks: t("actionThanks"),
          }}
        />
        <ReviewForm
          locale={locale}
          type="service"
          serviceSlug={serviceSlug}
          locationSlug={locationSlug}
          labels={{
            title: t("writeReview"),
            disclaimer: t("serviceDisclaimer"),
            name: t("name"),
            stars: t("stars"),
            reviewTitle: t("reviewTitle"),
            body: t("body"),
            area: t("area"),
            photo: t("photo"),
            submit: t("submitReview"),
            thanks: t("reviewThanks"),
            error: t("error"),
          }}
        />
      </section>
      <section className="rounded-[16px] border border-line/80 bg-white p-5 sm:p-6">
        <h2 className="text-[1.5rem] font-semibold leading-tight text-navy">{t("qaTitle")}</h2>
        <QaList
          items={questions}
          labels={{ empty: t("qaEmpty"), report: t("report"), thanks: t("actionThanks") }}
        />
        <QuestionForm locale={locale} serviceSlug={serviceSlug} locationSlug={locationSlug} />
      </section>
    </div>
  );
}
