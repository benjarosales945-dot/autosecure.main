const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create canvas 900x420
const width = 900;
const height = 420;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Create a vibrant gradient background (similar to the image)
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#ff6b35');    // Orange
gradient.addColorStop(0.25, '#f7931e'); // Orange-yellow
gradient.addColorStop(0.4, '#4da6ff');  // Blue
gradient.addColorStop(0.6, '#00d4ff');  // Cyan
gradient.addColorStop(0.8, '#7ed321');  // Green
gradient.addColorStop(1, '#ff1493');    // Pink

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Add a semi-transparent dark overlay for contrast
ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
ctx.fillRect(0, 0, width, height);

// Draw rounded rectangle border (dark)
const borderRadius = 30;
ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(borderRadius, 0);
ctx.lineTo(width - borderRadius, 0);
ctx.quadraticCurveTo(width, 0, width, borderRadius);
ctx.lineTo(width, height - borderRadius);
ctx.quadraticCurveTo(width, height, width - borderRadius, height);
ctx.lineTo(borderRadius, height);
ctx.quadraticCurveTo(0, height, 0, height - borderRadius);
ctx.lineTo(0, borderRadius);
ctx.quadraticCurveTo(0, 0, borderRadius, 0);
ctx.stroke();

// Draw inner content area (semi-transparent dark box)
const boxX = 40;
const boxY = 30;
const boxW = width - 80;
const boxH = height - 60;
ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
ctx.beginPath();
ctx.moveTo(boxX + borderRadius, boxY);
ctx.lineTo(boxX + boxW - borderRadius, boxY);
ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + borderRadius);
ctx.lineTo(boxX + boxW, boxY + boxH - borderRadius);
ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - borderRadius, boxY + boxH);
ctx.lineTo(boxX + borderRadius, boxY + boxH);
ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - borderRadius);
ctx.lineTo(boxX, boxY + borderRadius);
ctx.quadraticCurveTo(boxX, boxY, boxX + borderRadius, boxY);
ctx.fill();

// Draw text "AutoSecure Soon" in the center with glow effect
ctx.shadowColor = 'rgba(79, 221, 225, 0.8)';
ctx.shadowBlur = 20;
ctx.fillStyle = '#4fddfd';
ctx.font = 'bold 56px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('AutoSecure Soon', width / 2, height / 2);

// Reset shadow
ctx.shadowBlur = 0;

// Save the image
const outputDir = path.join(__dirname, '../assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'stats_embed_mockup.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);
console.log(`✅ Template image created at: ${outputPath}`);
