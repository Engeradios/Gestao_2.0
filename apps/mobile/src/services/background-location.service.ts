import * as Location from "expo-location";
import { Platform } from "react-native";
import { BACKGROUND_LOCATION_TASK } from "./background-location.task";

export type BackgroundStartResult = {
  started: boolean;
  reason?: "UNAVAILABLE" | "FOREGROUND_DENIED" | "BACKGROUND_DENIED";
};

export async function startBackgroundLocation(): Promise<BackgroundStartResult> {
  const available = await Location.hasServicesEnabledAsync();
  if (!available) return { started: false, reason: "UNAVAILABLE" };

  const foreground = await Location.getForegroundPermissionsAsync();
  const foregroundResult = foreground.granted
    ? foreground
    : await Location.requestForegroundPermissionsAsync();
  if (!foregroundResult.granted) {
    return { started: false, reason: "FOREGROUND_DENIED" };
  }

  const background = await Location.getBackgroundPermissionsAsync();
  const backgroundResult = background.granted
    ? background
    : await Location.requestBackgroundPermissionsAsync();
  if (!backgroundResult.granted) {
    return { started: false, reason: "BACKGROUND_DENIED" };
  }

  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    return { started: true };
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 300_000,
    distanceInterval: 25,
    deferredUpdatesInterval: 300_000,
    deferredUpdatesDistance: 25,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.OtherNavigation,
    foregroundService: Platform.OS === "android" ? {
      notificationTitle: "Engerádios: expediente ativo",
      notificationBody: "A localização operacional está sendo registrada.",
      notificationColor: "#D90000",
      killServiceOnDestroy: false,
    } : undefined,
  });
  return { started: true };
}

export async function stopBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export function backgroundLocationStarted() {
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
