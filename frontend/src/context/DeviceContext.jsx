import { createContext, useContext, useEffect, useState, useCallback } from "react";

const DeviceContext = createContext(null);
export const useDevice = () => useContext(DeviceContext);

const STORAGE_KEY = "dhl_device_mode";
export const DEVICE_MODES = ["celular", "tablet", "notebook"];

export function DeviceProvider({ children }) {
  const [deviceMode, _setDeviceMode] = useState(() => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return DEVICE_MODES.includes(v) ? v : null;
  });

  const setDeviceMode = useCallback((mode) => {
    if (!DEVICE_MODES.includes(mode)) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
    _setDeviceMode(mode);
  }, []);

  const resetDeviceMode = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    _setDeviceMode(null);
  }, []);

  // Reflect device mode as a class on <html> to enable global CSS overrides
  useEffect(() => {
    const html = document.documentElement;
    DEVICE_MODES.forEach((m) => html.classList.remove(`device-${m}`));
    if (deviceMode) html.classList.add(`device-${deviceMode}`);
  }, [deviceMode]);

  return (
    <DeviceContext.Provider value={{ deviceMode, setDeviceMode, resetDeviceMode }}>
      {children}
    </DeviceContext.Provider>
  );
}
