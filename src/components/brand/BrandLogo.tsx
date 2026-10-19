import { cn } from "@/lib/utils";
export const LOGO_SRC = "/media/brand/fixpoint-wordmark-960.webp";
/** Owner-approved artwork; mark for compact controls, full bilingual logo for identity. */
export function BrandLogo({size=44,className,priority,locale,variant="mark"}:{size?:number;className?:string;priority?:boolean;locale?:string;variant?:"mark"|"wordmark"}){
 const wordmark=variant==="wordmark";
 const src=wordmark?(size<=90?"/media/brand/fixpoint-wordmark-480.webp":LOGO_SRC):`/media/brand/fixpoint-mark-${size<=64?128:size<=200?280:512}.webp`;
 return <img src={src} alt={locale==="ar"?"فكس بوينت — النجاح الدائم":"FIXPOINT — Al Najah Al Daem"} width={wordmark?Math.round(size*3.288):size} height={size} decoding={priority?"sync":"async"} fetchPriority={priority?"high":"low"} loading={priority?"eager":"lazy"} className={cn("object-contain",className)} style={{height:size,width:"auto"}}/>;
}
