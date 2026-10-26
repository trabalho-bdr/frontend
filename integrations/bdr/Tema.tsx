import {createContext, useContext, type ReactNode} from 'react';
const ContextoTema = createContext({tema: 'light' as 'light' | 'dark', alternar: () => {}});
export const useTema = () => useContext(ContextoTema);
export function ProvedorTema({children}: {children: ReactNode}) {return <ContextoTema.Provider value={{tema:'light',alternar:()=>{}}}>{children}</ContextoTema.Provider>}
export function AlternarTema() {return null}
