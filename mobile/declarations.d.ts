declare module 'react-native' {
  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
    flatten: (style: any) => any;
  };
  export const Text: any;
  export const View: any;
  export const ScrollView: any;
  export const TouchableOpacity: any;
  export const Image: any;
  export const TextInput: any;
  export const SafeAreaView: any;
  export const Modal: any;
  export const StatusBar: any;
  export const ActivityIndicator: any;
  export const Platform: {
    OS: 'ios' | 'android' | 'web';
    select: <T>(obj: { ios?: T; android?: T; web?: T; default?: T }) => T;
  };
  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number; scale: number; fontScale: number };
  };
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
}

declare module 'expo-av' {
  export namespace Audio {
    export interface PlaybackStatusSuccess {
      isLoaded: true;
      isPlaying: boolean;
      positionMillis: number;
      durationMillis?: number;
      didJustFinish?: boolean;
      [key: string]: any;
    }

    export interface PlaybackStatusError {
      isLoaded: false;
      error?: string;
    }

    export type PlaybackStatus = PlaybackStatusSuccess | PlaybackStatusError;

    export class Sound {
      static createAsync(
        source: { uri: string } | number | any,
        initialStatus?: any,
        onPlaybackStatusUpdate?: (status: any) => void,
        downloadFirst?: boolean
      ): Promise<{ sound: Sound; status: any }>;
      playAsync(): Promise<any>;
      pauseAsync(): Promise<any>;
      stopAsync(): Promise<any>;
      unloadAsync(): Promise<any>;
      setPositionAsync(millis: number): Promise<any>;
      getStatusAsync(): Promise<any>;
    }

    export interface AudioModeOptions {
      staysActiveInBackground?: boolean;
      playsInSilentModeIOS?: boolean;
      shouldDuckAndroid?: boolean;
      playThroughEarpieceAndroid?: boolean;
      allowsRecordingIOS?: boolean;
      interruptionModeIOS?: number;
      interruptionModeAndroid?: number;
    }

    export function setAudioModeAsync(options: AudioModeOptions): Promise<void>;
  }
}

declare module 'expo-file-system';
declare module 'expo-sqlite';
declare module 'expo-status-bar';
