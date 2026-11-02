import{evaluateUnavailableArabicRepair,type UnavailableArabicEvidence}from'../src/lib/blog/unavailable-existing-repair-gates';
import type{BlogGateInput}from'../src/lib/blog/publication-gates';
export type LegacyRestorationEvidence=UnavailableArabicEvidence&{legacyMappingVerified:boolean;sourceSnapshotSha256:string};
/** Only preserves an existing, backed-up Latin locale address. All substantive
 * publication/availability checks remain the original production checks. */
export function evaluateUnavailableLegacyArabicRepair(input:BlogGateInput,e:LegacyRestorationEvidence){
const original=evaluateUnavailableArabicRepair(input,e),expected='https://fixpoint.ae/ar/blog/'+e.sourceSlug;
const sameLatinRoute=/^[a-z0-9-]+$/.test(input.slug)&&input.slug===e.sourceSlug&&e.originalArabicUrl===expected&&e.proposedArabicUrl===expected&&e.mappedArabicUrl===expected&&e.observedArabicFinalUrl===expected;
const backedUpMapping=e.legacyMappingVerified===true&&/^[a-f0-9]{64}$/.test(e.sourceSnapshotSha256);
const onlySlugFailure=original.failures.length===1&&original.failures[0]==='slug_not_arabic'&&original.quality.failures.length===1&&original.quality.failures[0]==='slug_not_arabic';
const preserve=sameLatinRoute&&backedUpMapping&&onlySlugFailure;
if(!preserve)return{...original,legacyExistingRoutePreserved:false,originalPublicationQuality:original.quality};
return{...original,pass:true,failures:[],quality:{...original.quality,pass:true,failures:[]},originalPublicationQuality:original.quality,legacyExistingRoutePreserved:true,preservationException:'EXISTING_BACKED_UP_LATIN_ARABIC_ADDRESS_ONLY',availabilityBypass:false,databaseWrites:false};
}
