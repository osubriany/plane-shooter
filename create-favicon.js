const canvas = document.createElement('canvas');
canvas.width = 32;
canvas.height = 32;
const ctx = canvas.getContext('2d');

// Draw a simple plane icon
ctx.fillStyle = '#00FF00';
ctx.fillRect(10, 10, 12, 12); // Body
ctx.fillStyle = '#0000FF';
ctx.fillRect(12, 8, 8, 4); // Wings

// Convert to favicon
const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/png';
link.href = canvas.toDataURL('image/png');
document.head.appendChild(link);
