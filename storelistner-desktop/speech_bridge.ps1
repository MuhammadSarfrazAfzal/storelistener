[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech

$sre = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$sre.SetInputToDefaultAudioDevice()
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$sre.LoadGrammar($grammar)

Register-ObjectEvent -InputObject $sre -EventName SpeechHypothesized -Action {
    $text = $Event.SourceEventArgs.Result.Text
    $json = @{ type = "interim"; text = $text } | ConvertTo-Json -Compress
    [Console]::WriteLine($json)
} | Out-Null

Register-ObjectEvent -InputObject $sre -EventName SpeechRecognized -Action {
    $text = $Event.SourceEventArgs.Result.Text
    $conf = $Event.SourceEventArgs.Result.Confidence
    if ($conf -gt 0.2 -and $text.Trim().Length -gt 0) {
        $json = @{ type = "final"; text = $text; confidence = [math]::Round($conf, 2) } | ConvertTo-Json -Compress
        [Console]::WriteLine($json)
    }
} | Out-Null

$sre.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
[Console]::WriteLine('{"type":"ready"}')

# Keep process alive until standard input is closed or Q is sent
try {
    while ($true) {
        $line = [Console]::ReadLine()
        if ($line -eq "QUIT" -or $line -eq $null) {
            break
        }
        Start-Sleep -Milliseconds 100
    }
} finally {
    $sre.RecognizeAsyncStop()
    $sre.Dispose()
}
