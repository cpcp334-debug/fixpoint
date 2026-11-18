import { mailUrl, siteConfig } from "@/config/site";

export function ElectricalRfqEmail({ locale }: { locale: string }) {
  const arabic = locale === "ar";
  const subject = arabic ? "طلب عرض سعر لأعمال كهربائية" : "Electrical work-package RFQ";
  const fields = arabic
    ? ["الشركة ودورها", "اسم المشروع وموقعه", "الأعمال المطلوب تسعيرها", "مرجع المخططات أو جدول الكميات ورقم المراجعة", "مسؤولية توريد المواد", "مسؤوليات التركيب والاختبار والتسليم", "قيود الدخول وساعات العمل", "الموعد المستهدف للبدء والتسليم", "الاستثناءات أو البنود التي تحتاج إلى تأكيد", "آخر موعد لتقديم العرض"]
    : ["Company and role", "Project name and location", "Electrical scope to price", "Drawing or BOQ reference and revision", "Who supplies materials", "Installation, testing and handover responsibilities", "Access restrictions and working hours", "Target start and handover dates", "Exclusions or items to confirm", "Quotation deadline"];
  const body = fields.map((field) => field + ": ").join("\r\n");
  const href = mailUrl() + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

  return (
    <p className="mt-3 text-sm text-muted">
      <a href={href} className="font-medium text-accent underline">
        {arabic ? "جهّز رسالة لطلب عرض سعر" : "Draft an electrical RFQ email"}
      </a>
      {" · "}<bdi dir="ltr">{siteConfig.email}</bdi>
      <br />
      {arabic
        ? "أكمل البنود التي تخص مشروعك واكتب «يُحدّد لاحقاً» للبنود غير المحسومة. أرفق جدول الكميات والمخططات التي يمكنك مشاركتها، أو اذكر مراجعها إذا كان تبادل الملفات يتطلب قناة خاصة."
        : "Complete the items that apply and mark undecided items “to confirm”. Attach the BOQ and drawings you can share, or list their references if the files need a separate transfer."}
    </p>
  );
}
