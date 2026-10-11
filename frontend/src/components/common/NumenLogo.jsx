function NumenLogo({
  size = 32,
  className = "",
  alt = "NumenDEX",
}) {
  return (
    <img
      src="/images/numendex-logo.png"
      alt={alt}
      className={`numen-logo-image ${className}`.trim()}
      width={size}
      height={size}
      draggable="false"
    />
  );
}

export default NumenLogo;