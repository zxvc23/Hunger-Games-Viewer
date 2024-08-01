const colors = ['#ff4136', '#0074d9', '#2ecc40', '#ffdc00', '#b10dc9', '#ff851b', '#7fdbff', '#f012be'];
        let zIndex = 1;
        const streams = new Map();
        const teamNames = new Map();
        let moveResizeMode = false;
        let teamCounter = 1;

        function toggleMoveResize() {
            moveResizeMode = document.getElementById('toggleMoveResize').checked;
            document.getElementById('modeLabel').innerText = `Move/Resize Mode: ${moveResizeMode ? 'On' : 'Off'}`;

            document.querySelectorAll('.streamFrame').forEach(frame => {
                const iframe = frame.querySelector('iframe');
                iframe.style.pointerEvents = moveResizeMode ? 'none' : 'auto';
                if (moveResizeMode) {
                    frame.classList.add('resize-mode');
                    frame.querySelectorAll('.resizer').forEach(resizer => {
                        resizer.style.display = 'block';
                    });
                } else {
                    frame.classList.remove('resize-mode');
                    frame.querySelectorAll('.resizer').forEach(resizer => {
                        resizer.style.display = 'none';
                    });
                }
            });
        }

        document.getElementById('toggleMoveResize').addEventListener('change', toggleMoveResize);

        function addStream(username) {
            if (!username) return;
            if (streams.has(username)) return;

            const streamContainer = document.getElementById('streamContainer');
            const streamFrame = document.createElement('div');
            streamFrame.classList.add('streamFrame', 'no-team');
            streamFrame.style.top = '0px';
            streamFrame.style.left = '0px';
            streamFrame.style.zIndex = zIndex++;

            const iframe = document.createElement('iframe');
            iframe.src = `https://player.kick.com/${username}?autoplay=true&muted=false`;
            streamFrame.appendChild(iframe);

            const colorPickerIcon = document.createElement('div');
            colorPickerIcon.classList.add('colorPickerIcon');
            colorPickerIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                showColorOptions(streamFrame, username);
            });
            streamFrame.appendChild(colorPickerIcon);

            const closeButton = document.createElement('div');
            closeButton.classList.add('closeButton');
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => {
                removeStream(username);
            });
            streamFrame.appendChild(closeButton);

            ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(position => {
                const resizer = document.createElement('div');
                resizer.classList.add('resizer', position);
                resizer.addEventListener('mousedown', initResize);
                streamFrame.appendChild(resizer);
            });

            streamContainer.appendChild(streamFrame);

            addStreamToMenu(username);
            streams.set(username, null);

            makeDraggable(streamFrame);
            updateTeamLegend();

            toggleMoveResize();
        }

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('addStreamButton').addEventListener('click', () => {
                const streamUrl = document.getElementById('streamUrl').value.trim();
                if (streamUrl) {
                    addStream(streamUrl);
                    document.getElementById('streamUrl').value = '';
                }
            });

            document.getElementById('streamUrl').addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    document.getElementById('addStreamButton').click();
                }
            });

            document.getElementById('toggleMoveResize').addEventListener('change', toggleMoveResize);

            toggleMoveResize();

            // Initialize toggle buttons
            document.querySelectorAll('.toggle-button').forEach(button => {
                button.addEventListener('click', toggleMenu);
            });
        });

        function addStreamToMenu(username) {
            const streamMenu = document.getElementById('streamMenu');
            const menuItem = document.createElement('div');
            menuItem.classList.add('menuItem');

            const menuName = document.createElement('span');
            menuName.textContent = username;
            menuName.classList.add('menuName');

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => {
                removeStream(username);
            });

            menuItem.appendChild(menuName);
            menuItem.appendChild(removeButton);
            streamMenu.appendChild(menuItem);
        }

        function removeStream(username) {
            // Find the stream frame associated with the username
            const streamFrame = Array.from(document.querySelectorAll('.streamFrame')).find(frame => {
                const iframe = frame.querySelector('iframe');
                return iframe && iframe.src.includes(username);
            });

            // Remove the associated menu item from the menu
            const menuItem = Array.from(document.querySelectorAll('#streamMenu .menuItem')).find(item => {
                const nameElement = item.querySelector('.menuName');
                return nameElement && nameElement.textContent === username;
            });

            // Check if the stream to be removed is the first in the players list
            const isFirstInList = menuItem && menuItem === document.querySelector('#streamMenu .menuItem');

            // Remove the stream frame from the DOM
            if (streamFrame) {
                streamFrame.remove();
            }

            if (menuItem) {
                menuItem.remove();
            }

            // Remove the stream from the Map
            streams.delete(username);

            // Recalculate zIndex for all remaining streams to maintain order
            const remainingFrames = Array.from(document.querySelectorAll('.streamFrame'));
            remainingFrames.forEach((frame, index) => {
                frame.style.zIndex = index + 1;
            });

            zIndex = remainingFrames.length + 1;

            // Update team legend and color tracker
            updateTeamLegend();
            updateColorTracker();

            // Refresh all remaining streams only if the first stream was removed
            if (isFirstInList) {
                refreshAllStreams();
            }

            // Ensure any ongoing listeners are cleaned up
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDragging);
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        }

        function refreshAllStreams() {
            // Refresh all remaining stream iframes
            document.querySelectorAll('.streamFrame iframe').forEach(iframe => {
                const src = iframe.src;
                iframe.src = '';  // Clear the source
                iframe.src = src; // Reassign the original source
            });
        }

        function updateColorTracker() {
            const teams = new Map();
            streams.forEach((color, username) => {
                if (color) {
                    if (!teams.has(color)) {
                        teams.set(color, []);
                    }
                    teams.get(color).push(username);
                }
            });

            const teamLegend = document.getElementById('teamLegend');
            teamLegend.innerHTML = '<h2>Teams <span class="toggle-button">-</span></h2>';

            teams.forEach((members, color) => {
                const teamItem = document.createElement('div');
                teamItem.classList.add('teamItem');
                const teamColor = document.createElement('div');
                teamColor.classList.add('teamColor');
                teamColor.style.backgroundColor = color;
                const teamNameInput = document.createElement('input');
                teamNameInput.type = 'text';
                teamNameInput.classList.add('teamName');
                teamNameInput.value = teamNames.get(color) || `Team ${teamCounter++}`;
                teamNameInput.addEventListener('change', (event) => {
                    teamNames.set(color, event.target.value);
                });

                teamItem.appendChild(teamColor);
                teamItem.appendChild(teamNameInput);
                teamItem.appendChild(document.createTextNode(` (${members.join(', ')})`));
                teamLegend.appendChild(teamItem);
            });

            // Reattach toggle button listeners
            document.querySelectorAll('.toggle-button').forEach(button => {
                button.addEventListener('click', toggleMenu);
            });
        }

        function updateTeamLegend() {
            const teamLegend = document.getElementById('teamLegend');
            teamLegend.innerHTML = '<h2>Teams <span class="toggle-button">-</span></h2>';

            const teams = new Map();
            let teamCounter = 1;

            streams.forEach((color, username) => {
                if (color) {
                    if (!teams.has(color)) {
                        teams.set(color, []);
                    }
                    teams.get(color).push(username);
                }
            });

            teams.forEach((members, color) => {
                const teamItem = document.createElement('div');
                teamItem.classList.add('teamItem');
                const teamColor = document.createElement('div');
                teamColor.classList.add('teamColor');
                teamColor.style.backgroundColor = color;
                const teamNameInput = document.createElement('input');
                teamNameInput.type = 'text';
                teamNameInput.classList.add('teamName');

                if (teamNames.has(color)) {
                    teamNameInput.value = teamNames.get(color);
                } else {
                    teamNameInput.value = `Team ${teamCounter}`;
                    teamNames.set(color, teamNameInput.value);
                }
                teamCounter++;

                teamNameInput.addEventListener('change', (event) => {
                    teamNames.set(color, event.target.value);
                });

                teamItem.appendChild(teamColor);
                teamItem.appendChild(teamNameInput);
                teamItem.appendChild(document.createTextNode(` (${members.join(', ')})`));
                teamLegend.appendChild(teamItem);
            });

            teamCounter = 1;

            // Reattach toggle button listeners
            document.querySelectorAll('.toggle-button').forEach(button => {
                button.addEventListener('click', toggleMenu);
            });
        }

        function toggleMenu(event) {
            const toggleButton = event.target;
            const menu = toggleButton.closest('div');

            if (menu.classList.contains('hiding')) {
                menu.classList.remove('hiding');
                toggleButton.textContent = '-';
            } else {
                menu.classList.add('hiding');
                toggleButton.textContent = '+';
            }
        }

        function showColorOptions(streamFrame, username) {
            let colorOptions = streamFrame.querySelector('.colorOptions');
            if (!colorOptions) {
                colorOptions = document.createElement('div');
                colorOptions.classList.add('colorOptions');
                colors.forEach(color => {
                    const colorOption = document.createElement('div');
                    colorOption.classList.add('colorOption');
                    colorOption.style.backgroundColor = color;
                    colorOption.addEventListener('click', () => {
                        streamFrame.style.borderColor = color;
                        streamFrame.classList.remove('no-team');
                        streamFrame.classList.add('team-assigned');
                        streams.set(username, color);
                        updateTeamLegend();
                        colorOptions.style.display = 'none';
                    });
                    colorOptions.appendChild(colorOption);
                });

                const noTeamOption = document.createElement('div');
                noTeamOption.classList.add('colorOption');
                noTeamOption.style.backgroundColor = 'transparent';
                noTeamOption.title = 'No Team';
                noTeamOption.addEventListener('click', () => {
                    streamFrame.style.borderColor = 'transparent';
                    streamFrame.classList.add('no-team');
                    streamFrame.classList.remove('team-assigned');
                    streams.set(username, null);
                    updateTeamLegend();
                    colorOptions.style.display = 'none';
                });
                colorOptions.appendChild(noTeamOption);

                streamFrame.appendChild(colorOptions);
            }

            if (colorOptions.style.display === 'flex') {
                colorOptions.style.display = 'none';
                currentColorOptions = null;
                currentStreamFrame = null;
            } else {
                colorOptions.style.display = 'flex';
                currentColorOptions = colorOptions;
                currentStreamFrame = streamFrame;
            }

            // Adjust the size of color options based on the stream size
            const streamWidth = parseInt(document.defaultView.getComputedStyle(streamFrame).width, 10);
            const colorSize = Math.min(20, Math.max(10, streamWidth / 16));
            colorOptions.querySelectorAll('.colorOption').forEach(option => {
                option.style.width = `${colorSize}px`;
                option.style.height = `${colorSize}px`;
            });
        }

        document.addEventListener('mousemove', (event) => {
            if (currentColorOptions && !currentStreamFrame.contains(event.target) && !currentColorOptions.contains(event.target)) {
                currentColorOptions.style.display = 'none';
                currentColorOptions = null;
                currentStreamFrame = null;
            }
        });

        function initResize(e) {
            if (!moveResizeMode) return;
            e.preventDefault();
            e.stopPropagation();
            const streamFrame = e.target.parentElement;
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = parseInt(document.defaultView.getComputedStyle(streamFrame).width, 10);
            const startHeight = parseInt(document.defaultView.getComputedStyle(streamFrame).height, 10);
            const startLeft = parseInt(document.defaultView.getComputedStyle(streamFrame).left, 10);
            const startTop = parseInt(document.defaultView.getComputedStyle(streamFrame).top, 10);
            const aspectRatio = startWidth / startHeight;
            const resizer = e.target;

            function doResize(e) {
                let newWidth, newHeight, newLeft, newTop;

                if (resizer.classList.contains('bottom-right')) {
                    newWidth = startWidth + (e.clientX - startX);
                    newHeight = newWidth / aspectRatio;
                } else if (resizer.classList.contains('top-left')) {
                    newWidth = startWidth - (e.clientX - startX);
                    newHeight = newWidth / aspectRatio;
                    newLeft = startLeft + (startWidth - newWidth);
                    newTop = startTop + (startHeight - newHeight);
                } else if (resizer.classList.contains('top-right')) {
                    newWidth = startWidth + (e.clientX - startX);
                    newHeight = newWidth / aspectRatio;
                    newTop = startTop + (startHeight - newHeight);
                } else if (resizer.classList.contains('bottom-left')) {
                    newWidth = startWidth - (e.clientX - startX);
                    newHeight = newWidth / aspectRatio;
                    newLeft = startLeft + (startWidth - newWidth);
                }

                if (newWidth > 100 && newHeight > 100) {
                    streamFrame.style.width = `${newWidth}px`;
                    streamFrame.style.height = `${newHeight}px`;
                    if (newLeft !== undefined) streamFrame.style.left = `${newLeft}px`;
                    if (newTop !== undefined) streamFrame.style.top = `${newTop}px`;
                }

                // Adjust the size of color options based on the new stream size
                const colorSize = Math.min(20, Math.max(10, newWidth / 16));
                const colorOptions = streamFrame.querySelector('.colorOptions');
                if (colorOptions) {
                    colorOptions.querySelectorAll('.colorOption').forEach(option => {
                        option.style.width = `${colorSize}px`;
                        option.style.height = `${colorSize}px`;
                    });
                }
            }

            function stopResize() {
                document.removeEventListener('mousemove', doResize);
                document.removeEventListener('mouseup', stopResize);
            }

            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
        }

        function makeDraggable(element) {
            let isDragging = false;
            let startX, startY, initialX, initialY;

            element.addEventListener('mousedown', (e) => {
                if (!moveResizeMode) return;
                e.preventDefault();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialX = element.offsetLeft;
                initialY = element.offsetTop;
                element.style.zIndex = zIndex++;  // Bring to front when dragging
                document.addEventListener('mousemove', drag);
                document.addEventListener('mouseup', stopDragging);
            });

            function drag(e) {
                if (isDragging) {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    element.style.left = `${initialX + dx}px`;
                    element.style.top = `${initialY + dy}px`;
                }
            }

            function stopDragging() {
                isDragging = false;
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', stopDragging);
            }
        }

        document.querySelectorAll('#teamLegend, #streamMenu').forEach(makeDraggable);

        document.getElementById('toggleMoveResize').checked = moveResizeMode;
        toggleMoveResize();