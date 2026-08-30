import * as Location from 'expo-location';
import * as SecureStore from './secure-store';
const KEY='engeradios.weather.cache.v1';
const MAX_AGE=30*60*1000;
export type WeatherSnapshot={temperature:number;apparent:number|null;code:number;updatedAt:string;source:'network'|'cache'};
type ApiResponse={current?:{temperature_2m?:number;apparent_temperature?:number;weather_code?:number}};
export async function getWeather():Promise<WeatherSnapshot|null>{
 const cached=await readCache();
 if(cached&&Date.now()-new Date(cached.updatedAt).getTime()<MAX_AGE)return {...cached,source:'cache'};
 try{
  const permission=await Location.getForegroundPermissionsAsync();
  if(!permission.granted)return cached?{...cached,source:'cache'}:null;
  const location=await Location.getLastKnownPositionAsync({maxAge:6*60*60*1000,requiredAccuracy:10000});
  if(!location)return cached?{...cached,source:'cache'}:null;
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`;
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`weather ${response.status}`);
  const data=await response.json() as ApiResponse;
  if(typeof data.current?.temperature_2m!=='number')throw new Error('weather payload');
  const value:WeatherSnapshot={temperature:Math.round(data.current.temperature_2m),apparent:typeof data.current.apparent_temperature==='number'?Math.round(data.current.apparent_temperature):null,code:data.current.weather_code??-1,updatedAt:new Date().toISOString(),source:'network'};
  await SecureStore.setItemAsync(KEY,JSON.stringify(value)); return value;
 }catch{return cached?{...cached,source:'cache'}:null}
}
async function readCache():Promise<WeatherSnapshot|null>{try{const raw=await SecureStore.getItemAsync(KEY);return raw?JSON.parse(raw) as WeatherSnapshot:null}catch{return null}}
export function weatherLabel(code:number){if(code===0)return 'Céu limpo';if(code<=3)return 'Parcialmente nublado';if(code<=48)return 'Neblina';if(code<=67)return 'Chuva';if(code<=77)return 'Granizo ou neve';if(code<=82)return 'Pancadas';if(code<=99)return 'Trovoadas';return 'Clima local'}
