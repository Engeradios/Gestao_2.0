export type AppPalette = {
  isDark:boolean; background:string; surface:string; surfaceAlt:string; text:string;
  textMuted:string; border:string; primary:string; primaryDark:string; success:string;
  warning:string; danger:string; nav:string; shadow:string;
};
export const light:AppPalette={isDark:false,background:'#F3F6FA',surface:'#FFFFFF',surfaceAlt:'#EAF0F6',text:'#10243E',textMuted:'#607086',border:'#DDE5EE',primary:'#C42032',primaryDark:'#971827',success:'#16835B',warning:'#D99216',danger:'#B4232F',nav:'#10243E',shadow:'#071B2F'};
export const dark:AppPalette={isDark:true,background:'#091521',surface:'#102231',surfaceAlt:'#172E40',text:'#F4F7FA',textMuted:'#AAB9C7',border:'#263E50',primary:'#EE4356',primaryDark:'#C42032',success:'#36B37E',warning:'#F3B544',danger:'#FF6B75',nav:'#07131F',shadow:'#000000'};
export const spacing={xs:4,sm:8,md:12,lg:16,xl:24,xxl:32};
export const radius={sm:10,md:14,lg:18,xl:24,pill:999};
