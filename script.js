document.addEventListener('DOMContentLoaded', () => {
    const spriteSelect = document.getElementById('sprite-select');
    const generateBtn = document.getElementById('generate-btn');
    const selectedSprite = document.getElementById('selected-sprite');
    const puzzleGrid = document.getElementById('puzzle-grid');
    const puzzlePieces = document.getElementById('puzzle-pieces');
    
    // Pokemon sprite mappings - add more as you get sprites
    const spriteMap = {
        pikachu: 'sprites/pikachu.png'
        // Add more sprites here as you collect them
    };
    
    // Update sprite when selection changes
    spriteSelect.addEventListener('change', () => {
        const selectedPokemon = spriteSelect.value;
        selectedSprite.src = spriteMap[selectedPokemon];
    });
    
    // Generate puzzle when button is clicked
    generateBtn.addEventListener('click', generatePuzzle);
    
    async function generatePuzzle() {
        const selectedPokemon = spriteSelect.value;
        const spriteSrc = spriteMap[selectedPokemon];
        
        try {
            // Load the sprite image
            const sprite = await loadImage(spriteSrc);
            
            // Create a canvas to analyze the sprite
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Determine the grid size (8x8 for simplicity, matching the example)
            const gridSize = 8;
            
            // Set canvas size to match grid
            canvas.width = gridSize;
            canvas.height = gridSize;
            
            // Draw the sprite scaled to fit our grid
            ctx.drawImage(sprite, 0, 0, gridSize, gridSize);
            
            // Get pixel data
            const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
            const pixelData = imageData.data;
            
            // Create grid representation (1 for filled, 0 for empty)
            const grid = [];
            for (let y = 0; y < gridSize; y++) {
                const row = [];
                for (let x = 0; x < gridSize; x++) {
                    const pixelIndex = (y * gridSize + x) * 4;
                    // Check if pixel is non-transparent and non-white
                    const r = pixelData[pixelIndex];
                    const g = pixelData[pixelIndex + 1];
                    const b = pixelData[pixelIndex + 2];
                    const a = pixelData[pixelIndex + 3];
                    
                    // Consider pixel filled if it's not transparent and not white
                    const isFilled = a > 50 && !(r > 200 && g > 200 && b > 200);
                    row.push(isFilled ? 1 : 0);
                }
                grid.push(row);
            }
            
            // Render the main puzzle grid
            renderPuzzleGrid(grid, gridSize);
            
            // Generate and render puzzle pieces
            generatePuzzlePieces(grid, gridSize);
            
        } catch (error) {
            console.error('Error generating puzzle:', error);
        }
    }
    
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    function renderPuzzleGrid(grid, gridSize) {
        // Clear previous grid
        puzzleGrid.innerHTML = '';
        
        // Set the grid template
        puzzleGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        
        // Column headers (A-H)
        for (let x = 0; x < gridSize; x++) {
            const colHeader = document.createElement('div');
            colHeader.className = 'coordinate-label col-label';
            colHeader.textContent = String.fromCharCode(65 + x); // A, B, C, etc.
            puzzleGrid.appendChild(colHeader);
        }
        
        // Create cells with row headers
        for (let y = 0; y < gridSize; y++) {
            // Row header (1-8)
            const rowHeader = document.createElement('div');
            rowHeader.className = 'coordinate-label row-label';
            rowHeader.textContent = (y + 1).toString();
            puzzleGrid.appendChild(rowHeader);
            
            for (let x = 0; x < gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                // For the main grid, we don't fill any cells
                // This creates the empty puzzle grid
                
                puzzleGrid.appendChild(cell);
            }
        }
    }
    
    function generatePuzzlePieces(grid, gridSize) {
        // Clear previous pieces
        puzzlePieces.innerHTML = '';
        
        // Generate puzzle pieces (3x3 grid segments)
        const pieceSize = 3;
        
        // Track which coordinates we've used for piece labels
        const usedCoordinates = new Set();
        
        // Create pieces for each cell in the grid
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                // Only create pieces for filled cells
                if (grid[y][x] === 1) {
                    // Generate a unique coordinate label
                    const colLetter = String.fromCharCode(65 + x);
                    const rowNumber = y + 1;
                    const coordinate = `${colLetter}${rowNumber}`;
                    
                    // Check if we've already used this coordinate
                    if (!usedCoordinates.has(coordinate)) {
                        usedCoordinates.add(coordinate);
                        
                        // Create piece container
                        const pieceContainer = document.createElement('div');
                        pieceContainer.className = 'puzzle-piece';
                        
                        // Create 3x3 grid for this piece
                        const pieceGrid = document.createElement('div');
                        pieceGrid.className = 'piece-grid';
                        
                        // Calculate the bounds of the 3x3 grid centered on this cell
                        const startX = Math.max(0, x - 1);
                        const startY = Math.max(0, y - 1);
                        const endX = Math.min(gridSize - 1, x + 1);
                        const endY = Math.min(gridSize - 1, y + 1);
                        
                        // Create the 3x3 piece grid (or smaller if on edge)
                        for (let py = 0; py < pieceSize; py++) {
                            for (let px = 0; px < pieceSize; px++) {
                                const cell = document.createElement('div');
                                cell.className = 'piece-cell';
                                
                                // Check if this cell in the piece corresponds to a grid position
                                const gridX = startX + px;
                                const gridY = startY + py;
                                
                                // Make sure we're within grid bounds
                                if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
                                    // Fill cell if the corresponding grid cell is filled
                                    if (grid[gridY][gridX] === 1) {
                                        cell.classList.add('filled');
                                    }
                                }
                                
                                pieceGrid.appendChild(cell);
                            }
                        }
                        
                        // Add the piece grid to the container
                        pieceContainer.appendChild(pieceGrid);
                        
                        // Add coordinate label
                        const label = document.createElement('div');
                        label.className = 'piece-label';
                        label.textContent = coordinate;
                        pieceContainer.appendChild(label);
                        
                        // Add the piece to the puzzle pieces container
                        puzzlePieces.appendChild(pieceContainer);
                    }
                }
            }
        }
    }
});
