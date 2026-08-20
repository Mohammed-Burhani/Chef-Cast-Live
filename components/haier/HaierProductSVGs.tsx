/**
 * Haier product illustrations as React Native SVG components.
 * These are dummy placeholder assets (no real Haier product imagery was available),
 * designed to read as clean line-art kitchen appliances with Haier branding.
 */
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text } from "react-native-svg";
import React from "react";
import { ViewStyle } from "react-native";

interface ProductSVGProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function HaierOven({ width = 400, height = 300, style }: ProductSVGProps) {
  return (
    <Svg viewBox="0 0 400 300" width={width} height={height} style={style}>
      <Defs>
        <LinearGradient id="ovenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#2D2D2D" />
          <Stop offset="50%" stopColor="#1A1A1A" />
          <Stop offset="100%" stopColor="#0D0D0D" />
        </LinearGradient>
        <LinearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1A3A5C" stopOpacity={0.9} />
          <Stop offset="50%" stopColor="#0D1F3A" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#051020" stopOpacity={1} />
        </LinearGradient>
        <LinearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#C0C0C0" />
          <Stop offset="50%" stopColor="#E8E8E8" />
          <Stop offset="100%" stopColor="#C0C0C0" />
        </LinearGradient>
        <LinearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#CC0000" />
          <Stop offset="100%" stopColor="#E3000F" />
        </LinearGradient>
      </Defs>
      <Rect x="40" y="30" width="320" height="240" rx={8} fill="url(#ovenGrad)" />
      <Rect x="40" y="30" width="320" height="45" rx={8} fill="#1A1A1A" />
      <Rect x="60" y="40" width="280" height="25" rx={4} fill="#0D0D0D" />
      <G fill="url(#handleGrad)">
        <Circle cx="100" cy="52" r="10" stroke="#999" strokeWidth={1} />
        <Circle cx="180" cy="52" r="10" stroke="#999" strokeWidth={1} />
        <Circle cx="260" cy="52" r="10" stroke="#999" strokeWidth={1} />
        <Circle cx="340" cy="52" r="10" stroke="#999" strokeWidth={1} />
      </G>
      <G stroke="#CC0000" strokeWidth={2} strokeLinecap="round">
        <Line x1="100" y1="52" x2="100" y2="44" />
        <Line x1="180" y1="52" x2="188" y2="47" />
        <Line x1="260" y1="52" x2="252" y2="47" />
        <Line x1="340" y1="52" x2="340" y2="44" />
      </G>
      <Rect x="130" y="42" width="140" height="21" rx={3} fill="#0A0A0A" />
      <Text x="200" y="57" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="#CC0000" textAnchor="middle">220°C</Text>
      <Rect x="60" y="85" width="280" height="160" rx={4} fill="url(#glassGrad)" />
      <Rect x="65" y="90" width="270" height="30" rx={2} fill="#FFFFFF" opacity={0.08} />
      <G stroke="#333" strokeWidth={2}>
        <Line x1="80" y1="140" x2="300" y2="140" />
        <Line x1="80" y1="180" x2="300" y2="180" />
      </G>
      <Ellipse cx="190" cy="155" rx="35" ry="20" fill="#D4A017" opacity={0.9} />
      <Ellipse cx="190" cy="155" rx="25" ry="12" fill="#B8860B" />
      <Rect x="170" y="255" width="60" height="8" rx={4} fill="url(#handleGrad)" />
      <Rect x="175" y="258" width="50" height="3" rx={1.5} fill="#FFFFFF" opacity={0.3} />
      <Rect x="140" y="270" width="120" height="18" rx={3} fill="#0D0D0D" />
      <Text x="200" y="283" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#CC0000" textAnchor="middle">Haier</Text>
      <Text x="200" y="293" fontFamily="Arial, sans-serif" fontSize="8" fill="#888" textAnchor="middle">Series 7</Text>
      <Rect x="40" y="270" width="320" height="3" fill="url(#accentGrad)" />
    </Svg>
  );
}

export function HaierFridge({ width = 300, height = 450, style }: ProductSVGProps) {
  return (
    <Svg viewBox="0 0 300 450" width={width} height={height} style={style}>
      <Defs>
        <LinearGradient id="fridgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E8E8E8" />
          <Stop offset="50%" stopColor="#D0D0D0" />
          <Stop offset="100%" stopColor="#B8B8B8" />
        </LinearGradient>
        <LinearGradient id="doorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#F5F5F5" />
          <Stop offset="50%" stopColor="#E0E0E0" />
          <Stop offset="100%" stopColor="#D0D0D0" />
        </LinearGradient>
        <LinearGradient id="handleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#C0C0C0" />
          <Stop offset="50%" stopColor="#E8E8E8" />
          <Stop offset="100%" stopColor="#B0B0B0" />
        </LinearGradient>
        <LinearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#CC0000" />
          <Stop offset="100%" stopColor="#E3000F" />
        </LinearGradient>
        <LinearGradient id="interiorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFF8E0" />
          <Stop offset="100%" stopColor="#FFE8B0" />
        </LinearGradient>
      </Defs>
      <Rect x="20" y="20" width="260" height="410" rx={12} fill="url(#fridgeGrad)" stroke="#A0A0A0" strokeWidth={1} />
      <Rect x="20" y="20" width="260" height="50" rx={12} fill="#1A1A1A" />
      <Rect x="50" y="30" width="200" height="30" rx={4} fill="#0D0D0D" />
      <Text x="150" y="50" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#CC0000" textAnchor="middle">4°C  •  -18°C</Text>
      <Rect x="30" y="85" width="240" height="180" rx={6} fill="url(#doorGrad)" />
      <Rect x="230" y="130" width="12" height="80" rx={6} fill="url(#handleGrad)" />
      <Rect x="232" y="135" width="8" height="70" rx={4} fill="#FFFFFF" opacity={0.3} />
      <Rect x="30" y="265" width="240" height="4" fill="#A0A0A0" opacity={0.3} />
      <Rect x="30" y="275" width="240" height="135" rx={6} fill="url(#doorGrad)" />
      <Rect x="230" y="315" width="12" height="55" rx={6} fill="url(#handleGrad)" />
      <Rect x="232" y="318" width="8" height="49" rx={4} fill="#FFFFFF" opacity={0.3} />
      <Rect x="40" y="95" width="180" height="160" rx={4} fill="url(#interiorGrad)" opacity={0.15} />
      <G stroke="#CCCCCC" strokeWidth={1.5} opacity={0.6}>
        <Line x1="45" y1="130" x2="215" y2="130" />
        <Line x1="45" y1="170" x2="215" y2="170" />
        <Line x1="45" y1="210" x2="215" y2="210" />
        <Line x1="45" y1="300" x2="215" y2="300" />
        <Line x1="45" y1="340" x2="215" y2="340" />
      </G>
      <G opacity={0.2}>
        <Rect x="55" y="105" width="20" height="45" rx={2} fill="#FFFFFF" />
        <Rect x="58" y="105" width="14" height="8" rx={1} fill="#FFD700" />
        <Ellipse cx="100" cy="150" rx="22" ry="12" fill="#FFF8DC" />
        <G fill="#FFE0B0">
          <Ellipse cx="88" cy="145" rx="6" ry="4" />
          <Ellipse cx="100" cy="145" rx="6" ry="4" />
          <Ellipse cx="112" cy="145" rx="6" ry="4" />
          <Ellipse cx="94" cy="155" rx="6" ry="4" />
          <Ellipse cx="106" cy="155" rx="6" ry="4" />
        </G>
        <Ellipse cx="160" cy="150" rx="18" ry="20" fill="#4CAF50" opacity={0.5} />
        <Ellipse cx="180" cy="145" rx="12" ry="10" fill="#FF9800" opacity={0.5} />
        <Rect x="55" y="285" width="35" height="25" rx={3} fill="#87CEEB" />
        <Rect x="100" y="285" width="30" height="22" rx={3} fill="#FFB6C1" />
        <Rect x="140" y="285" width="28" height="20" rx={3} fill="#98FB98" />
        <Rect x="180" y="285" width="35" height="30" rx={4} fill="#FFDAB9" />
        <Rect x="182" y="287" width="31" height="8" rx={2} fill="#FFB6C1" />
      </G>
      <Rect x="70" y="415" width="160" height="20" rx={3} fill="#0D0D0D" />
      <Text x="150" y="428" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#CC0000" textAnchor="middle">Haier</Text>
      <Text x="150" y="438" fontFamily="Arial, sans-serif" fontSize="8" fill="#888" textAnchor="middle">Series 7 • FreshZone</Text>
      <Rect x="20" y="435" width="260" height="3" fill="url(#accentGrad)" />
    </Svg>
  );
}

export function HaierCooktop({ width = 500, height = 350, style }: ProductSVGProps) {
  return (
    <Svg viewBox="0 0 500 350" width={width} height={height} style={style}>
      <Defs>
        <LinearGradient id="cooktopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1A1A1A" />
          <Stop offset="100%" stopColor="#0D0D0D" />
        </LinearGradient>
        <RadialGradient id="burnerGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#2A2A2A" />
          <Stop offset="60%" stopColor="#1A1A1A" />
          <Stop offset="100%" stopColor="#0D0D0D" />
        </RadialGradient>
        <RadialGradient id="flameGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFD700" />
          <Stop offset="30%" stopColor="#FFB800" />
          <Stop offset="60%" stopColor="#CC0000" stopOpacity={0.8} />
          <Stop offset="100%" stopColor="#E3000F" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="knobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#C0C0C0" />
          <Stop offset="50%" stopColor="#E8E8E8" />
          <Stop offset="100%" stopColor="#B0B0B0" />
        </LinearGradient>
        <LinearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#CC0000" />
          <Stop offset="100%" stopColor="#E3000F" />
        </LinearGradient>
      </Defs>
      <Rect x="30" y="30" width="440" height="290" rx={12} fill="url(#cooktopGrad)" />
      <Circle cx="140" cy="140" r="70" fill="url(#burnerGrad)" />
      <Circle cx="140" cy="140" r="55" fill="none" stroke="#333" strokeWidth={2} />
      <Circle cx="140" cy="140" r="45" fill="url(#flameGrad)" />
      <G fill="url(#flameGrad)" opacity={0.9}>
        <Path d="M140 90 Q130 70 140 50 Q150 70 140 90" />
        <Path d="M140 90 Q125 65 135 45 Q145 65 140 90" />
        <Path d="M140 90 Q155 65 145 45 Q135 65 140 90" />
        <Path d="M140 100 Q120 75 130 55 Q140 75 140 100" />
        <Path d="M140 100 Q160 75 150 55 Q140 75 140 100" />
      </G>
      <Circle cx="360" cy="140" r="55" fill="url(#burnerGrad)" />
      <Circle cx="360" cy="140" r="45" fill="none" stroke="#333" strokeWidth={2} />
      <Circle cx="360" cy="140" r="38" fill="#1A1A1A" />
      <Circle cx="140" cy="280" r="65" fill="url(#burnerGrad)" />
      <Circle cx="140" cy="280" r="52" fill="none" stroke="#333" strokeWidth={2} />
      <Circle cx="140" cy="280" r="42" fill="#1A1A1A" />
      <Circle cx="360" cy="280" r="55" fill="url(#burnerGrad)" />
      <Circle cx="360" cy="280" r="45" fill="none" stroke="#333" strokeWidth={2} />
      <Circle cx="360" cy="280" r="38" fill="#1A1A1A" />
      <Ellipse cx="250" cy="210" rx="50" ry="35" fill="url(#burnerGrad)" />
      <Ellipse cx="250" cy="210" rx="42" ry="28" fill="none" stroke="#333" strokeWidth={2} />
      <Ellipse cx="250" cy="210" rx="35" ry="22" fill="#1A1A1A" />
      <G fill="url(#knobGrad)">
        <Circle cx="140" cy="55" r="16" stroke="#999" strokeWidth={1} />
        <Circle cx="360" cy="55" r="16" stroke="#999" strokeWidth={1} />
      </G>
      <G stroke="#CC0000" strokeWidth={3} strokeLinecap="round">
        <Line x1="140" y1="55" x2="140" y2="42" />
        <Line x1="360" y1="55" x2="368" y2="50" />
      </G>
      <Text x="140" y="30" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#CC0000" textAnchor="middle">3.5kW</Text>
      <Text x="360" y="30" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#888" textAnchor="middle">2.0kW</Text>
      <Rect x="180" y="50" width="140" height="20" rx={10} fill="#0D0D0D" />
      <Text x="250" y="64" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600" fill="#CC0000" textAnchor="middle">PowerBoost</Text>
      <G transform="translate(140, 85)">
        <Path d="M-45 15 Q-45 0 -35 0 L35 0 Q45 0 45 15 L40 55 Q40 65 30 65 L-30 65 Q-40 65 -40 55 Z" fill="#3A3A3A" stroke="#555" strokeWidth={2} />
        <Path d="M-35 5 Q-35 2 -30 2 L30 2 Q35 2 35 5 L32 35 Q32 40 25 40 L-25 40 Q-32 40 -32 35 Z" fill="#555" opacity={0.3} />
        <Path d="M-45 20 Q-55 20 -55 30 Q-55 40 -45 40" fill="none" stroke="#3A3A3A" strokeWidth={4} strokeLinecap="round" />
        <Path d="M45 20 Q55 20 55 30 Q55 40 45 40" fill="none" stroke="#3A3A3A" strokeWidth={4} strokeLinecap="round" />
        <G stroke="#FFF" strokeWidth={1.5} opacity={0.4}>
          <Path d="M-20 0 Q-22 -15 -18 -25 Q-14 -15 -16 0" />
          <Path d="M0 0 Q-2 -18 0 -30 Q2 -18 4 0" />
          <Path d="M20 0 Q22 -15 18 -25 Q14 -15 16 0" />
        </G>
      </G>
      <Rect x="180" y="320" width="140" height="20" rx={3} fill="#0D0D0D" />
      <Text x="250" y="333" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#CC0000" textAnchor="middle">Haier</Text>
      <Text x="250" y="342" fontFamily="Arial, sans-serif" fontSize="8" fill="#888" textAnchor="middle">Series 7 • 5 Zone</Text>
      <Rect x="30" y="315" width="440" height="3" fill="url(#accentGrad)" />
    </Svg>
  );
}

export function HaierDishwasher({ width = 400, height = 400, style }: ProductSVGProps) {
  return (
    <Svg viewBox="0 0 400 400" width={width} height={height} style={style}>
      <Defs>
        <LinearGradient id="dwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E0E0E0" />
          <Stop offset="50%" stopColor="#C8C8C8" />
          <Stop offset="100%" stopColor="#B0B0B0" />
        </LinearGradient>
        <LinearGradient id="doorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#F0F0F0" />
          <Stop offset="50%" stopColor="#E0E0E0" />
          <Stop offset="100%" stopColor="#D0D0D0" />
        </LinearGradient>
        <LinearGradient id="handleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#C0C0C0" />
          <Stop offset="50%" stopColor="#E8E8E8" />
          <Stop offset="100%" stopColor="#B0B0B0" />
        </LinearGradient>
        <LinearGradient id="interiorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#E8F4FF" />
          <Stop offset="100%" stopColor="#D0E8FF" />
        </LinearGradient>
        <LinearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#CC0000" />
          <Stop offset="100%" stopColor="#E3000F" />
        </LinearGradient>
        <RadialGradient id="sprayGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#4DA6FF" stopOpacity={0.8} />
          <Stop offset="100%" stopColor="#1E88E5" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="30" y="30" width="340" height="340" rx={12} fill="url(#dwGrad)" stroke="#A0A0A0" strokeWidth={1} />
      <Rect x="30" y="30" width="340" height="60" rx={12} fill="#1A1A1A" />
      <Rect x="180" y="40" width="170" height="40" rx={6} fill="#0D0D0D" />
      <Text x="265" y="66" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="#CC0000" textAnchor="middle">Auto 3:45</Text>
      <Text x="265" y="80" fontFamily="Arial, sans-serif" fontSize="9" fill="#888" textAnchor="middle">Eco • 50°C</Text>
      <G fill="none" stroke="#CC0000" strokeWidth={2}>
        <Circle cx="60" cy="55" r="14" />
        <Circle cx="100" cy="55" r="14" />
        <Circle cx="140" cy="55" r="14" />
      </G>
      <G fontFamily="Arial, sans-serif" fontSize="8" fill="#CC0000" textAnchor="middle" fontWeight="600">
        <Text x="60" y="58">▶</Text>
        <Text x="100" y="58">⏸</Text>
        <Text x="140" y="58">⟳</Text>
      </G>
      <Rect x="40" y="105" width="320" height="250" rx={6} fill="url(#doorGrad)" />
      <Rect x="290" y="180" width="10" height="100" rx={5} fill="url(#handleGrad)" />
      <Rect x="291" y="185" width="8" height="90" rx={4} fill="#FFFFFF" opacity={0.3} />
      <Rect x="55" y="120" width="290" height="220" rx={4} fill="url(#interiorGrad)" opacity={0.15} />
      <G stroke="#4DA6FF" strokeWidth={2} opacity={0.6}>
        <Path d="M65 140 Q65 130 75 130 L305 130 Q315 130 315 140" />
        <Path d="M80 155 L300 155" />
        <Path d="M80 170 L300 170" />
        <Path d="M80 185 L300 185" />
      </G>
      <G stroke="#4DA6FF" strokeWidth={2} opacity={0.6}>
        <Path d="M65 280 Q65 270 75 270 L305 270 Q315 270 315 280" />
        <Path d="M80 295 L300 295" />
        <Path d="M80 310 L300 310" />
        <Path d="M80 325 L300 325" />
      </G>
      <G opacity={0.3} fill="#FFFFFF" stroke="#DDD" strokeWidth={1}>
        <Ellipse cx="100" cy="150" rx="18" ry="4" />
        <Ellipse cx="150" cy="150" rx="18" ry="4" />
        <Ellipse cx="200" cy="150" rx="18" ry="4" />
        <Ellipse cx="250" cy="150" rx="18" ry="4" />
        <Ellipse cx="300" cy="150" rx="18" ry="4" />
        <Rect x="90" y="160" width="16" height="25" rx={2} />
        <Rect x="130" y="160" width="16" height="25" rx={2} />
        <Rect x="170" y="160" width="16" height="25" rx={2} />
        <Rect x="210" y="160" width="16" height="25" rx={2} />
        <Rect x="250" y="160" width="16" height="25" rx={2} />
        <Rect x="290" y="160" width="16" height="25" rx={2} />
      </G>
      <G opacity={0.3} fill="#FFFFFF" stroke="#DDD" strokeWidth={1}>
        <Ellipse cx="100" cy="295" rx="28" ry="8" fill="#E0E0E0" />
        <Ellipse cx="100" cy="295" rx="22" ry="4" fill="#FFFFFF" />
        <Ellipse cx="200" cy="295" rx="25" ry="7" fill="#E0E0E0" />
        <Ellipse cx="200" cy="295" rx="19" ry="3" fill="#FFFFFF" />
        <Ellipse cx="300" cy="295" rx="22" ry="6" fill="#E0E0E0" />
        <Ellipse cx="300" cy="295" rx="16" ry="3" fill="#FFFFFF" />
        <Rect x="145" y="310" width="10" height="30" rx={1} />
        <Rect x="160" y="310" width="10" height="30" rx={1} />
        <Rect x="175" y="310" width="10" height="30" rx={1} />
        <Rect x="245" y="310" width="10" height="30" rx={1} />
        <Rect x="260" y="310" width="10" height="30" rx={1} />
        <Rect x="275" y="310" width="10" height="30" rx={1} />
      </G>
      <Circle cx="200" cy="200" r="60" fill="none" stroke="url(#sprayGrad)" strokeWidth={2} strokeDasharray="10,5" opacity={0.5} />
      <Circle cx="200" cy="300" r="50" fill="none" stroke="url(#sprayGrad)" strokeWidth={2} strokeDasharray="10,5" opacity={0.5} />
      <Rect x="110" y="370" width="180" height="20" rx={3} fill="#0D0D0D" />
      <Text x="200" y="383" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#CC0000" textAnchor="middle">Haier</Text>
      <Text x="200" y="392" fontFamily="Arial, sans-serif" fontSize="8" fill="#888" textAnchor="middle">Series 7 • AutoSense</Text>
      <Rect x="30" y="365" width="340" height="3" fill="url(#accentGrad)" />
    </Svg>
  );
}
