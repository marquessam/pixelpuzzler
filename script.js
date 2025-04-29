document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const spriteSelect = document.getElementById('sprite-select');
    const generateBtn = document.getElementById('generate-btn');
    const selectedSprite = document.getElementById('selected-sprite');
    const puzzleGrid = document.getElementById('puzzle-grid');
    const puzzlePieces = document.getElementById('puzzle-pieces');
    const originalSprite = document.querySelector('.original-sprite');
    const statusMessage = document.getElementById('status-message');
    const checkSolutionBtn = document.getElementById('check-solution-btn');
    const resetBtn = document.getElementById('reset-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const victoryModal = document.getElementById('victory-modal');
    const revealedPokemon = document.getElementById('revealed-pokemon');
    const playAgainBtn = document.getElementById('play-again-btn');
    
    // Game state
    let currentSprite = null;
    let originalPixels = [];
    let gameActive = false;
    let selectedPiece = null;
    let pieceSize = 4; // Size of each puzzle piece (4x4)
    let gridSize = 8;  // Full grid size (8x8)
    let userGrid = [];
    let currentPokemon = '';
    
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
    
    // Event listeners
    generateBtn.addEventListener('click', startNewGame);
    checkSolutionBtn.addEventListener('click', checkSolution);
    resetBtn.addEventListener('click', resetPuzzle);
    revealBtn.addEventListener('click', revealSolution);
    playAgainBtn.addEventListener('click', () => {
        victoryModal.classList.remove('active');
        resetPuzzle();
    });
    
    // Start a new game
    async function startNewGame() {
        gameActive = true;
        currentPokemon = spriteSelect.value;
        statusMessage.textContent = `Who's that Pokémon? Solve the puzzle to find out!`;
        originalSprite.classList.add('hidden');
        
        // Enable game buttons
        checkSolutionBtn.disabled = false;
        resetBtn.disabled = false;
        revealBtn.disabled = false;
        
        try {
            // Load the sprite image
            currentSprite = await loadImage(spriteMap[currentPokemon]);
            selectedSprite.src = spriteMap[currentPokemon];
            
            // Create a canvas to analyze the sprite
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match grid
            canvas.width = gridSize;
            canvas.height = gridSize;
            
            // Draw the sprite scaled to fit our grid
            ctx.drawImage(currentSprite, 0, 0, gridSize, gridSize);
            
            // Get pixel data
            const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
            const pixelData = imageData.data;
            
            // Store original pixels
            originalPixels = [];
            for (let y = 0; y < gridSize; y++) {
                const row = [];
                for (let x = 0; x < gridSize; x++) {
                    const pixelIndex = (y * gridSize + x) * 4;
                    const r = pixelData[pixelIndex];
                    const g = pixelData[pixelIndex + 1];
                    const b = pixelData[pixelIndex + 2];
                    const a = pixelData[pixelIndex + 3];
                    
                    // Store RGBA values
                    row.push({r, g, b, a});
                }
                originalPixels.push(row);
            }
            
            // Initialize empty user grid
            userGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
            
            // Render the empty puzzle grid
            renderPuzzleGrid();
            
            // Generate puzzle pieces
            generatePuzzlePieces();
            
        } catch (error) {
            console.error('Error generating puzzle:', error);
            statusMessage.textContent = `Error: Could not generate puzzle. Please try again.`;
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
    
    function renderPuzzleGrid() {
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
        
        // Create the grid cells
        for (let y = 0; y < gridSize; y++) {
            // Row header (1-8)
            const rowHeader = document.createElement('div');
            rowHeader.className = 'coordinate-label row-label';
            rowHeader.textContent = (y + 1).toString();
            puzzleGrid.appendChild(rowHeader);
            
            for (let x = 0; x < gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // Add the region identifier based on which piece this cell belongs to
                const regionX = Math.floor(x / pieceSize);
                const regionY = Math.floor(y / pieceSize);
                cell.dataset.region = `${regionX}-${regionY}`;
                
                // Add a border to show the piece boundaries
                if (x % pieceSize === 0) cell.classList.add('left-edge');
                if (y % pieceSize === 0) cell.classList.add('top-edge');
                if (x % pieceSize === pieceSize - 1) cell.classList.add('right-edge');
                if (y % pieceSize === pieceSize - 1) cell.classList.add('bottom-edge');
                
                // Add click event for placing pieces
                cell.addEventListener('click', () => {
                    if (!gameActive || !selectedPiece) return;
                    
                    const regionX = Math.floor(x / pieceSize);
                    const regionY = Math.floor(y / pieceSize);
                    const region = `${regionX}-${regionY}`;
                    
                    // Place the selected piece in this region
                    placePiece(region, selectedPiece.dataset.originalRegion);
                    
                    // Deselect the piece
                    if (selectedPiece) {
                        selectedPiece.classList.remove('selected');
                        selectedPiece = null;
                    }
                });
                
                puzzleGrid.appendChild(cell);
            }
        }
    }
    
    function generatePuzzlePieces() {
        // Clear previous pieces
        puzzlePieces.innerHTML = '';
        
        // Calculate how many pieces we'll have (2x2 grid of pieces)
        const piecesPerRow = gridSize / pieceSize;
        const totalPieces = piecesPerRow * piecesPerRow;
        
        // Create an array of piece regions
        const regions = [];
        for (let y = 0; y < piecesPerRow; y++) {
            for (let x = 0; x < piecesPerRow; x++) {
                regions.push(`${x}-${y}`);
            }
        }
        
        // Shuffle the regions for randomness
        const shuffledRegions = [...regions].sort(() => Math.random() - 0.5);
        
        // Create a puzzle piece for each region
        for (let i = 0; i < totalPieces; i++) {
            const originalRegion = regions[i];
            const [ox, oy] = originalRegion.split('-').map(Number);
            
            // Create piece container
            const pieceContainer = document.createElement('div');
            pieceContainer.className = 'puzzle-piece';
            pieceContainer.dataset.originalRegion = originalRegion;
            
            // Create canvas for this piece
            const canvas = document.createElement('canvas');
            canvas.width = pieceSize;
            canvas.height = pieceSize;
            canvas.className = 'piece-canvas';
            const ctx = canvas.getContext('2d');
            
            // Draw this piece from the original pixels
            for (let py = 0; py < pieceSize; py++) {
                for (let px = 0; px < pieceSize; px++) {
                    const x = ox * pieceSize + px;
                    const y = oy * pieceSize + py;
                    
                    if (x < gridSize && y < gridSize) {
                        const pixel = originalPixels[y][x];
                        ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a / 255})`;
                        ctx.fillRect(px, py, 1, 1);
                    }
                }
            }
            
            // Add the piece canvas to the container
            pieceContainer.appendChild(canvas);
            
            // Add coordinate label
            const label = document.createElement('div');
            label.className = 'piece-label';
            
            // Calculate coordinates based on original region
            const startX = ox * pieceSize;
            const startY = oy * pieceSize;
            const endX = Math.min(startX + pieceSize - 1, gridSize - 1);
            const endY = Math.min(startY + pieceSize - 1, gridSize - 1);
            
            const startCol = String.fromCharCode(65 + startX);
            const endCol = String.fromCharCode(65 + endX);
            const startRow = startY + 1;
            const endRow = endY + 1;
            
            label.textContent = `${startCol}${startRow}-${endCol}${endRow}`;
            pieceContainer.appendChild(label);
            
            // Add click event to select this piece
            pieceContainer.addEventListener('click', () => {
                if (!gameActive) return;
                
                // Deselect previously selected piece
                if (selectedPiece) {
                    selectedPiece.classList.remove('selected');
                }
                
                // Select this piece
                selectedPiece = pieceContainer;
                pieceContainer.classList.add('selected');
                
                // Show a message to guide the user
                statusMessage.textContent = `Selected piece ${label.textContent}. Click on the grid to place it.`;
            });
            
            // Add the piece to the puzzle pieces container
            puzzlePieces.appendChild(pieceContainer);
        }
    }
    
    // Place a puzzle piece in the grid
    function placePiece(gridRegion, originalRegion) {
        const [gridX, gridY] = gridRegion.split('-').map(Number);
        const [originalX, originalY] = originalRegion.split('-').map(Number);
        
        // Update the user grid
        for (let y = 0; y < pieceSize; y++) {
            for (let x = 0; x < pieceSize; x++) {
                const targetX = gridX * pieceSize + x;
                const targetY = gridY * pieceSize + y;
                const sourceX = originalX * pieceSize + x;
                const sourceY = originalY * pieceSize + y;
                
                if (targetX < gridSize && targetY < gridSize && 
                    sourceX < gridSize && sourceY < gridSize) {
                    userGrid[targetY][targetX] = originalRegion;
                }
            }
        }
        
        // Update the visual grid
        updateGridDisplay();
    }
    
    // Update the grid display based on the user's current solution
    function updateGridDisplay() {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
                if (!cell) continue;
                
                // Clear existing style
                cell.style.backgroundColor = '';
                
                // Check if this cell has been assigned a piece
                if (userGrid[y][x]) {
                    const [originalX, originalY] = userGrid[y][x].split('-').map(Number);
                    const originalPieceX = originalX * pieceSize;
                    const originalPieceY = originalY * pieceSize;
                    
                    // Calculate the position within the piece
                    const pieceOffsetX = x % pieceSize;
                    const pieceOffsetY = y % pieceSize;
                    
                    // Get the original pixel at this position
                    const originalX2 = originalPieceX + pieceOffsetX;
                    const originalY2 = originalPieceY + pieceOffsetY;
                    
                    if (originalX2 < gridSize && originalY2 < gridSize) {
                        const pixel = originalPixels[originalY2][originalX2];
                        if (pixel.a > 0) {
                            cell.style.backgroundColor = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a / 255})`;
                        }
                    }
                }
            }
        }
    }
    
    // Check if user's solution matches the original layout
    function checkSolution() {
        if (!gameActive) return;
        
        let correct = true;
        let placedPieces = 0;
        const totalPieces = (gridSize / pieceSize) * (gridSize / pieceSize);
        
        // Count how many pieces are placed
        const placedRegions = new Set();
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (userGrid[y][x]) {
                    const regionX = Math.floor(x / pieceSize);
                    const regionY = Math.floor(y / pieceSize);
                    const region = `${regionX}-${regionY}`;
                    placedRegions.add(region);
                }
            }
        }
        
        placedPieces = placedRegions.size;
        
        // Check if all pieces are in the correct position
        for (let y = 0; y < gridSize; y += pieceSize) {
            for (let x = 0; x < gridSize; x += pieceSize) {
                const regionX = x / pieceSize;
                const regionY = y / pieceSize;
                const expectedRegion = `${regionX}-${regionY}`;
                
                // Check if this region has a piece placed
                if (!userGrid[y][x]) {
                    correct = false;
                    continue;
                }
                
                // Check if the piece is in the correct position
                if (userGrid[y][x] !== expectedRegion) {
                    correct = false;
                }
            }
        }
        
        if (correct && placedPieces === totalPieces) {
            // Success! Puzzle solved
            gameActive = false;
            
            // Show victory modal
            revealedPokemon.innerHTML = `<img src="${spriteMap[currentPokemon]}" alt="${currentPokemon}">`;
            victoryModal.classList.add('active');
            
            // Update status message
            statusMessage.textContent = `Congratulations! You've found ${capitalizeFirstLetter(currentPokemon)}!`;
            originalSprite.classList.remove('hidden');
        } else {
            // Not correct yet
            const percentComplete = Math.round((placedPieces / totalPieces) * 100);
            statusMessage.textContent = `Not quite right. You've placed ${placedPieces} out of ${totalPieces} pieces (${percentComplete}%). Keep trying!`;
        }
    }
    
    // Reset the puzzle
    function resetPuzzle() {
        if (!gameActive) return;
        
        // Reset user grid
        userGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
        
        // Clear the grid display
        updateGridDisplay();
        
        // Deselect selected piece
        if (selectedPiece) {
            selectedPiece.classList.remove('selected');
            selectedPiece = null;
        }
        
        statusMessage.textContent = `Puzzle reset. Who's that Pokémon?`;
    }
    
    // Reveal the solution
    function revealSolution() {
        if (!gameActive) return;
        
        gameActive = false;
        
        // Place all pieces in their correct positions
        for (let y = 0; y < gridSize / pieceSize; y++) {
            for (let x = 0; x < gridSize / pieceSize; x++) {
                const region = `${x}-${y}`;
                placePiece(region, region);
            }
        }
        
        // Show the original sprite
        originalSprite.classList.remove('hidden');
        
        // Update status message
        statusMessage.textContent = `Solution revealed! It's ${capitalizeFirstLetter(currentPokemon)}!`;
    }
    
    // Helper function to capitalize the first letter of a string
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
});
