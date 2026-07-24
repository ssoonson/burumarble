import { CHARACTER_IMAGES } from "../constants.js";

export default function CharacterAvatar({ emoji, className = "" }) {
  const src = CHARACTER_IMAGES[emoji];
  if (src) {
    return <img src={src} alt={emoji} className={`character-avatar ${className}`} />;
  }
  return <span className={className}>{emoji}</span>;
}
