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
    
    // Sprite and puzzle dimensions
    const spriteSize = 64;            // Full sprite size (64x64 pixels)
    const gridDimension = 4;          // Grid is 4x4 (16 squares)
    const pieceSize = spriteSize / gridDimension; // Each piece is 16x16 pixels
    
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
            
            // Set canvas size to match sprite size
            canvas.width = spriteSize;
            canvas.height = spriteSize;
            
            // Draw the sprite
            ctx.drawImage(currentSprite, 0, 0, spriteSize, spriteSize);
            
            // Get pixel data
            const imageData = ctx.getImageData(0, 0, spriteSize, spriteSize);
            const pixelData = imageData.data;
            
            // Store original pixels
            originalPixels = [];
            for (let y = 0; y < spriteSize; y++) {
                const row = [];
                for (let x = 0; x < spriteSize; x++) {
                    const pixelIndex = (y * spriteSize + x) * 4;
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
            userGrid = Array(gridDimension).fill().map(() => Array(gridDimension).fill(null));
            
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
        puzzleGrid.style.gridTemplateColumns = `repeat(${gridDimension}, 1fr)`;
        
        // Column headers (A-D for a 4x4 grid)
        for (let x = 0; x < gridDimension; x++) {
            const colHeader = document.createElement('div');
            colHeader.className = 'coordinate-label col-label';
            colHeader.textContent = String.fromCharCode(65 + x); // A, B, C, D
            puzzleGrid.appendChild(colHeader);
        }
        
        // Create the grid cells
        for (let y = 0; y < gridDimension; y++) {
            // Row header (1-4)
            const rowHeader = document.createElement('div');
            rowHeader.className = 'coordinate-label row-label';
            rowHeader.textContent = (y + 1).toString();
            puzzleGrid.appendChild(rowHeader);
            
            for (let x = 0; x < gridDimension; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // Add borders to show grid regions
                if (x > 0) cell.classList.add('left-edge');
                if (y > 0) cell.classList.add('top-edge');
                if (x < gridDimension - 1) cell.classList.add('right-edge');
                if (y < gridDimension - 1) cell.classList.add('bottom-edge');
                
                // Add click event for placing pieces
                cell.addEventListener('click', () => {
                    if (!gameActive || !selectedPiece) return;
                    
                    // Place the selected piece in this region
                    placePiece(x, y, selectedPiece.dataset.originalX, selectedPiece.dataset.originalY);
                    
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
        
        // Create an array of piece positions
        const positions = [];
        for (let y = 0; y < gridDimension; y++) {
            for (let x = 0; x < gridDimension; x++) {
                positions.push({x, y});
            }
        }
        
        // Shuffle the positions for randomness
        const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);
        
        // Create a puzzle piece for each position
        for (let i = 0; i < positions.length; i++) {
            const originalPos = positions[i];
            const ox = originalPos.x;
            const oy = originalPos.y;
            
            // Create piece container
            const pieceContainer = document.createElement('div');
            pieceContainer.className = 'puzzle-piece';
            pieceContainer.dataset.originalX = ox;
            pieceContainer.dataset.originalY = oy;
            
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
                    
                    if (x < spriteSize && y < spriteSize) {
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
            
            // Calculate coordinates based on original position
            const startX = ox * pieceSize;
            const startY = oy * pieceSize;
            const endX = startX + pieceSize - 1;
            const endY = startY + pieceSize - 1;
            
            // Convert to letter-number format (e.g., A1-B2)
            const startCol = String.fromCharCode(65 + Math.floor(startX / pieceSize));
            const startRow = Math.floor(startY / pieceSize) + 1;
            label.textContent = `${startCol}${startRow}`;
            
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
    function placePiece(gridX, gridY, originalX, originalY) {
        // Update the user grid
        userGrid[gridY][gridX] = {
            originalX: parseInt(originalX),
            originalY: parseInt(originalY)
        };
        
        // Update the visual grid
        updateGridDisplay();
    }
    
    // Update the grid display based on the user's current solution
    function updateGridDisplay() {
        for (let y = 0; y < gridDimension; y++) {
            for (let x = 0; x < gridDimension; x++) {
                const cell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
                if (!cell) continue;
                
                // Clear existing content
                cell.innerHTML = '';
                
                // Check if this cell has been assigned a piece
                if (userGrid[y][x]) {
                    const originalX = userGrid[y][x].originalX;
                    const originalY = userGrid[y][x].originalY;
                    
                    // Create a canvas for this cell
                    const canvas = document.createElement('canvas');
                    canvas.width = pieceSize;
                    canvas.height = pieceSize;
                    canvas.className = 'cell-canvas';
                    const ctx = canvas.getContext('2d');
                    
                    // Draw the piece from original pixels
                    for (let py = 0; py < pieceSize; py++) {
                        for (let px = 0; px < pieceSize; px++) {
                            const srcX = originalX * pieceSize + px;
                            const srcY = originalY * pieceSize + py;
                            
                            if (srcX < spriteSize && srcY < spriteSize) {
                                const pixel = originalPixels[srcY][srcX];
                                ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a / 255})`;
                                ctx.fillRect(px, py, 1, 1);
                            }
                        }
                    }
                    
                    cell.appendChild(canvas);
                }
            }
        }
    }
    
    // Check if user's solution matches the original layout
    function checkSolution() {
        if (!gameActive) return;
        
        let correct = true;
        let placedPieces = 0;
        const totalPieces = gridDimension * gridDimension;
        
        // Count how many pieces are placed and check if they're in the right position
        for (let y = 0; y < gridDimension; y++) {
            for (let x = 0; x < gridDimension; x++) {
                // Check if this position has a piece
                if (userGrid[y][x]) {
                    placedPieces++;
                    
                    // Check if the piece is in the correct position
                    if (userGrid[y][x].originalX !== x || userGrid[y][x].originalY !== y) {
                        correct = false;
                    }
                } else {
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
        if (!gameActive && !confirm("Start a new game?")) return;
        
        gameActive = true;
        
        // Reset user grid
        userGrid = Array(gridDimension).fill().map(() => Array(gridDimension).fill(null));
        
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
        for (let y = 0; y < gridDimension; y++) {
            for (let x = 0; x < gridDimension; x++) {
                userGrid[y][x] = {
                    originalX: x,
                    originalY: y
                };
            }
        }
        
        // Update the visual grid
        updateGridDisplay();
        
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
