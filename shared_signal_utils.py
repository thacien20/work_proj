# Shared Signal Generation Utilities
# This module provides reusable signal generation functions that can be used across the entire project

import numpy as np
from typing import Tuple, List, Optional, Dict, Any

class SignalGenerator:
    """
    Reusable signal generation class that can be used across different modules
    """
    
    @staticmethod
    def generate_time_array(duration: float, sample_rate: int) -> np.ndarray:
        """Generate time array for signal generation"""
        return np.linspace(0, duration, int(sample_rate * duration))
    
    @staticmethod
    def sine_wave(frequency: float, amplitude: float = 1.0, phase: float = 0.0, 
                  duration: float = 1.0, sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate a sine wave signal
        
        Args:
            frequency: Frequency in Hz
            amplitude: Signal amplitude
            phase: Phase shift in radians
            duration: Duration in seconds
            sample_rate: Sampling rate in Hz
            
        Returns:
            Tuple of (time_array, signal_array)
        """
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        y = amplitude * np.sin(2 * np.pi * frequency * t + phase)
        return t, y
    
    @staticmethod
    def cosine_wave(frequency: float, amplitude: float = 1.0, phase: float = 0.0,
                    duration: float = 1.0, sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate a cosine wave signal
        
        Args:
            frequency: Frequency in Hz
            amplitude: Signal amplitude
            phase: Phase shift in radians
            duration: Duration in seconds
            sample_rate: Sampling rate in Hz
            
        Returns:
            Tuple of (time_array, signal_array)
        """
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        y = amplitude * np.cos(2 * np.pi * frequency * t + phase)
        return t, y
    
    @staticmethod
    def square_wave(frequency: float, amplitude: float = 1.0, phase: float = 0.0,
                    duration: float = 1.0, sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate a square wave signal"""
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        y = amplitude * np.sign(np.sin(2 * np.pi * frequency * t + phase))
        return t, y
    
    @staticmethod
    def triangle_wave(frequency: float, amplitude: float = 1.0, phase: float = 0.0,
                      duration: float = 1.0, sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate a triangle wave signal"""
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        y = amplitude * (2/np.pi) * np.arcsin(np.sin(2 * np.pi * frequency * t + phase))
        return t, y
    
    @staticmethod
    def sawtooth_wave(frequency: float, amplitude: float = 1.0, phase: float = 0.0,
                      duration: float = 1.0, sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate a sawtooth wave signal"""
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        y = amplitude * (2 * ((frequency * t + phase/(2*np.pi)) % 1) - 1)
        return t, y
    
    @staticmethod
    def impulse_train(frequency: float, amplitude: float = 1.0, phase: float = 0.0,
                      duration: float = 1.0, sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate an impulse train signal"""
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        y = np.zeros_like(t)
        impulse_indices = np.where(np.abs(t % (1/frequency)) < 1/sample_rate)[0]
        y[impulse_indices] = amplitude
        return t, y
    
    @staticmethod
    def generate_signal(signal_type: str, frequency: float, amplitude: float = 1.0, 
                       phase: float = 0.0, duration: float = 1.0, 
                       sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Universal signal generation function
        
        Args:
            signal_type: Type of signal ('sine', 'cosine', 'square', 'triangle', 'sawtooth', 'impulse')
            frequency: Frequency in Hz
            amplitude: Signal amplitude
            phase: Phase shift in radians
            duration: Duration in seconds
            sample_rate: Sampling rate in Hz
            
        Returns:
            Tuple of (time_array, signal_array)
        """
        generators = {
            'sine': SignalGenerator.sine_wave,
            'cosine': SignalGenerator.cosine_wave,
            'square': SignalGenerator.square_wave,
            'triangle': SignalGenerator.triangle_wave,
            'sawtooth': SignalGenerator.sawtooth_wave,
            'impulse': SignalGenerator.impulse_train
        }
        
        if signal_type not in generators:
            raise ValueError(f"Unknown signal type: {signal_type}")
        
        return generators[signal_type](frequency, amplitude, phase, duration, sample_rate)


class ModulationGenerator:
    """
    Reusable modulation signal generation class
    """
    
    @staticmethod
    def amplitude_modulation(carrier_freq: float, modulating_freq: float, 
                           modulation_index: float = 0.5, duration: float = 1.0,
                           sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate an amplitude modulated (AM) signal
        
        Args:
            carrier_freq: Carrier frequency in Hz
            modulating_freq: Modulating frequency in Hz
            modulation_index: Modulation index (0-1)
            duration: Duration in seconds
            sample_rate: Sampling rate in Hz
            
        Returns:
            Tuple of (time_array, modulated_signal)
        """
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        carrier = np.sin(2 * np.pi * carrier_freq * t)
        modulating = np.sin(2 * np.pi * modulating_freq * t)
        am_signal = carrier * (1 + modulation_index * modulating)
        return t, am_signal
    
    @staticmethod
    def frequency_modulation(carrier_freq: float, modulating_freq: float,
                           frequency_deviation: float = 10.0, duration: float = 1.0,
                           sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate a frequency modulated (FM) signal
        
        Args:
            carrier_freq: Carrier frequency in Hz
            modulating_freq: Modulating frequency in Hz
            frequency_deviation: Frequency deviation in Hz
            duration: Duration in seconds
            sample_rate: Sampling rate in Hz
            
        Returns:
            Tuple of (time_array, modulated_signal)
        """
        t = SignalGenerator.generate_time_array(duration, sample_rate)
        modulating = np.sin(2 * np.pi * modulating_freq * t)
        instantaneous_freq = carrier_freq + frequency_deviation * modulating
        # Integrate to get phase
        phase = 2 * np.pi * np.cumsum(instantaneous_freq) / sample_rate
        fm_signal = np.sin(phase)
        return t, fm_signal


class SignalAnalyzer:
    """
    Reusable signal analysis functions
    """
    
    @staticmethod
    def analyze_signal(signal: np.ndarray, sample_rate: int = 1000) -> Dict[str, float]:
        """
        Analyze basic signal properties
        
        Args:
            signal: Input signal array
            sample_rate: Sampling rate in Hz
            
        Returns:
            Dictionary with analysis results
        """
        # Calculate basic properties
        rms = np.sqrt(np.mean(signal**2))
        peak = np.max(np.abs(signal))
        mean = np.mean(signal)
        
        # Simple frequency analysis
        fft = np.fft.fft(signal)
        freqs = np.fft.fftfreq(len(signal), 1/sample_rate)
        
        # Find dominant frequency
        dominant_freq_idx = np.argmax(np.abs(fft[1:len(fft)//2])) + 1
        dominant_frequency = freqs[dominant_freq_idx]
        
        return {
            'rms': float(rms),
            'peak': float(peak),
            'mean': float(mean),
            'dominant_frequency': float(abs(dominant_frequency))
        }
    
    @staticmethod
    def compute_spectrum(signal: np.ndarray, sample_rate: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute frequency spectrum of a signal
        
        Args:
            signal: Input signal array
            sample_rate: Sampling rate in Hz
            
        Returns:
            Tuple of (frequencies, magnitudes)
        """
        fft = np.fft.fft(signal)
        freqs = np.fft.fftfreq(len(signal), 1/sample_rate)
        
        # Only return positive frequencies
        positive_freq_idx = freqs >= 0
        freqs = freqs[positive_freq_idx]
        magnitudes = np.abs(fft[positive_freq_idx])
        
        return freqs, magnitudes
