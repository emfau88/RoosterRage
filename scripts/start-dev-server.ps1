Set-Location 'C:\Users\madde\Documents\ROOSTER'

$node = 'C:\Program Files\nodejs\node.exe'
$vite = 'C:\Users\madde\Documents\ROOSTER\node_modules\vite\bin\vite.js'
$log = 'C:\Users\madde\Documents\ROOSTER\test-results\vite-dev.log'

New-Item -ItemType Directory -Force -Path 'C:\Users\madde\Documents\ROOSTER\test-results' | Out-Null
& $node $vite --host 127.0.0.1 --port 5173 *> $log
