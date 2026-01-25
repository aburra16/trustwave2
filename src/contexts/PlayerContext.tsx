import React, { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react';
import type { ScoredListItem, PodcastValue } from '@/lib/types';

interface PlayerState {
  currentTrack: ScoredListItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: ScoredListItem[];
  queueIndex: number;
  isLoading: boolean;
  error: string | null;
  valueInfo: PodcastValue | null;
}

type PlayerAction =
  | { type: 'SET_TRACK'; track: ScoredListItem; queue?: ScoredListItem[]; index?: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREV_TRACK' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_VALUE_INFO'; value: PodcastValue | null }
  | { type: 'ADD_TO_QUEUE'; track: ScoredListItem }
  | { type: 'CLEAR_QUEUE' };

const initialState: PlayerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  queueIndex: -1,
  isLoading: false,
  error: null,
  valueInfo: null,
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_TRACK':
      return {
        ...state,
        currentTrack: action.track,
        queue: action.queue || state.queue,
        queueIndex: action.index ?? state.queueIndex,
        currentTime: 0,
        duration: action.track.songDuration || 0,
        isPlaying: true,
        error: null,
      };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_TIME':
      return { ...state, currentTime: action.time };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'SET_VOLUME':
      return { ...state, volume: action.volume };
    case 'NEXT_TRACK': {
      const nextIndex = state.queueIndex + 1;
      if (nextIndex < state.queue.length) {
        return {
          ...state,
          currentTrack: state.queue[nextIndex],
          queueIndex: nextIndex,
          currentTime: 0,
          isPlaying: true,
          error: null,
        };
      }
      return { ...state, isPlaying: false };
    }
    case 'PREV_TRACK': {
      // If more than 3 seconds in, restart current track
      if (state.currentTime > 3) {
        return { ...state, currentTime: 0 };
      }
      const prevIndex = state.queueIndex - 1;
      if (prevIndex >= 0) {
        return {
          ...state,
          currentTrack: state.queue[prevIndex],
          queueIndex: prevIndex,
          currentTime: 0,
          isPlaying: true,
          error: null,
        };
      }
      return { ...state, currentTime: 0 };
    }
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'SET_VALUE_INFO':
      return { ...state, valueInfo: action.value };
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.track] };
    case 'CLEAR_QUEUE':
      return { ...state, queue: [], queueIndex: -1 };
    default:
      return state;
  }
}

interface PlayerContextValue {
  state: PlayerState;
  audioRef: React.RefObject<HTMLAudioElement>;
  playTrack: (track: ScoredListItem, queue?: ScoredListItem[], index?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addToQueue: (track: ScoredListItem) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Sync audio element with state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (state.isPlaying) {
      audio.play().catch(error => {
        console.error('Playback failed:', error);
        dispatch({ type: 'SET_ERROR', error: 'Failed to play audio' });
      });
    } else {
      audio.pause();
    }
  }, [state.isPlaying, state.currentTrack]);
  
  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (!state.currentTrack?.songUrl) {
      console.error('No songUrl available for current track:', state.currentTrack);
      dispatch({ type: 'SET_ERROR', error: 'No audio URL available' });
      return;
    }
    
    console.log('Loading audio from URL:', state.currentTrack.songUrl);
    dispatch({ type: 'SET_LOADING', loading: true });
    audio.src = state.currentTrack.songUrl;
    audio.load();
  }, [state.currentTrack?.songUrl]);
  
  // Set volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = state.volume;
    }
  }, [state.volume]);
  
  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      dispatch({ type: 'SET_TIME', time: audio.currentTime });
    };
    
    const handleDurationChange = () => {
      dispatch({ type: 'SET_DURATION', duration: audio.duration });
    };
    
    const handleEnded = () => {
      dispatch({ type: 'NEXT_TRACK' });
    };
    
    const handleCanPlay = () => {
      dispatch({ type: 'SET_LOADING', loading: false });
    };
    
    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      console.error('Audio error:', {
        error: audioElement.error,
        src: audioElement.src,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState,
      });
      dispatch({ type: 'SET_ERROR', error: 'Failed to load audio' });
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);
  
  const playTrack = useCallback((track: ScoredListItem, queue?: ScoredListItem[], index?: number) => {
    console.log('Playing track:', {
      title: track.songTitle,
      url: track.songUrl,
      hasUrl: !!track.songUrl,
    });
    dispatch({ type: 'SET_TRACK', track, queue, index });
  }, []);
  
  const play = useCallback(() => {
    dispatch({ type: 'PLAY' });
  }, []);
  
  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);
  
  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);
  
  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      dispatch({ type: 'SET_TIME', time });
    }
  }, []);
  
  const setVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_VOLUME', volume });
  }, []);
  
  const nextTrack = useCallback(() => {
    dispatch({ type: 'NEXT_TRACK' });
  }, []);
  
  const prevTrack = useCallback(() => {
    dispatch({ type: 'PREV_TRACK' });
  }, []);
  
  const addToQueue = useCallback((track: ScoredListItem) => {
    dispatch({ type: 'ADD_TO_QUEUE', track });
  }, []);
  
  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR_QUEUE' });
  }, []);
  
  return (
    <PlayerContext.Provider
      value={{
        state,
        audioRef: audioRef as React.RefObject<HTMLAudioElement>,
        playTrack,
        play,
        pause,
        togglePlay,
        seek,
        setVolume,
        nextTrack,
        prevTrack,
        addToQueue,
        clearQueue,
      }}
    >
      {children}
      <audio ref={audioRef} preload="metadata" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
