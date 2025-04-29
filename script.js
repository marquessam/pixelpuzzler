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
    let currentGrid = [];
    let userGrid = [];
    let gridSize = 8;
    let currentPokemon = '';
    let gameActive = false;
    
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
            const sprite = await loadImage(spriteMap[currentPokemon]);
            selectedSprite.src = spriteMap[currentPokemon];
            
            // Create a canvas to analyze the sprite
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Determine the grid size (8x8 for simplicity, matching the example)
            gridSize = 8;
            
            // Set canvas size to match grid
            canvas.width = gridSize;
            canvas.height = gridSize;
            
            // Draw the sprite scaled to fit our grid
            ctx.drawImage(sprite, 0, 0, gridSize, gridSize);
            
            // Get pixel data
            const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
            const pixelData = imageData.data;
            
            // Create grid representation (1 for filled, 0 for empty)
            currentGrid = [];
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
                currentGrid.push(row);
            }
            
            // Initialize user grid (all empty)
            userGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
            
            // Render the interactive puzzle grid
            renderInteractiveGrid(currentGrid, gridSize);
            
            // Generate and render puzzle pieces as clues
            generatePuzzlePieces(currentGrid, gridSize);
            
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
    
    function renderInteractiveGrid(grid, gridSize) {
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
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // Add click event for toggling cell state
                cell.addEventListener('click', () => {
                    if (!gameActive) return;
                    
                    // Toggle cell state
                    if (cell.classList.contains('filled')) {
                        cell.classList.remove('filled');
                        userGrid[y][x] = 0;
                    } else {
                        cell.classList.add('filled');
                        userGrid[y][x] = 1;
                    }
                });
                
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
                        pieceContainer.dataset.coordinate = coordinate;
                        
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
                        
                        // Add click event to highlight the corresponding cell in the main grid
                        pieceContainer.addEventListener('click', () => {
                            if (!gameActive) return;
                            
                            // Extract coordinates
                            const col = coordinate.charAt(0);
                            const row = coordinate.substring(1);
                            
                            // Convert to x, y indices
                            const x = col.charCodeAt(0) - 65; // A=0, B=1, etc.
                            const y = parseInt(row) - 1;      // 1=0, 2=1, etc.
                            
                            // Find the corresponding cell in the main grid
                            const targetCell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
                            
                            if (targetCell) {
                                // Highlight the cell by adding a temporary class
                                targetCell.classList.add('highlight');
                                setTimeout(() => {
                                    targetCell.classList.remove('highlight');
                                }, 1000);
                            }
                        });
                        
                        // Add the piece to the puzzle pieces container
                        puzzlePieces.appendChild(pieceContainer);
                    }
                }
            }
        }
    }
    
    // Check if user's solution matches the actual grid
    function checkSolution() {
        if (!gameActive) return;
        
        let correct = true;
        let totalCells = 0;
        let correctCells = 0;
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (currentGrid[y][x] === 1) {
                    totalCells++;
                    if (userGrid[y][x] === 1) {
                        correctCells++;
                    } else {
                        correct = false;
                    }
                } else if (userGrid[y][x] === 1) {
                    correct = false;
                }
            }
        }
        
        if (correct) {
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
            const percentComplete = Math.round((correctCells / totalCells) * 100);
            statusMessage.textContent = `Not quite right. You've filled ${correctCells} out of ${totalCells} correct cells (${percentComplete}%). Keep trying!`;
        }
    }
    
    // Reset the puzzle
    function resetPuzzle() {
        if (!gameActive) return;
        
        // Reset user grid
        userGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        
        // Clear all filled cells in the UI
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('filled');
        });
        
        statusMessage.textContent = `Puzzle reset. Who's that Pokémon?`;
    }
    
    // Reveal the solution
    function revealSolution() {
        if (!gameActive) return;
        
        gameActive = false;
        
        // Fill in all cells according to the solution
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cell = document.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
                if (currentGrid[y][x] === 1) {
                    cell.classList.add('filled');
                } else {
                    cell.classList.remove('filled');
                }
            }
        }
        
        // Update user grid to match current grid
        userGrid = currentGrid.map(row => [...row]);
        
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
