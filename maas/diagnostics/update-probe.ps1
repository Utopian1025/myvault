$ErrorActionPreference='Stop'
$root=Join-Path $env:RUNNER_TEMP 'maas-update-probe'
$zip=$root+'.zip'
Invoke-WebRequest 'https://github.com/Utopian1025/myvault/releases/download/maas-excel-v0.8.9.15/Maas_Excel_v0.8.9.15.zip' -OutFile $zip -UseBasicParsing
if((Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne '15c5dcae2a5a4426a5eda67d44d26243bec17e92c8687c571953f8215f5227f1'){throw 'bootstrap hash mismatch'}
Expand-Archive $zip $root
$a=[Reflection.Assembly]::LoadFrom((Join-Path $root 'Data/Maas.Navigation.dll'))
$t=$a.GetType('Maas.SoftwareUpdate')
$m=$t.GetMethod('Read',[Reflection.BindingFlags]'Static,NonPublic')
$mirrorField=$t.GetField('Mirrors',[Reflection.BindingFlags]'Static,NonPublic')
$oldMirrors=$mirrorField.GetValue($null)
$mirrorField.SetValue($null,[string[]]@('https://gh-proxy.org/','https://ghfast.top/','https://ghproxy.net/','https://gh-proxy.com/'))
$passed=0
$url='https://github.com/Utopian1025/myvault/releases/download/maas-excel-v0.8.9.15/Maas_Excel_v0.8.9.15.zip'
foreach($prefix in @('https://gh-proxy.org/','https://ghfast.top/','https://ghproxy.net/','https://gh-proxy.com/','')){
 $watch=[Diagnostics.Stopwatch]::StartNew()
 try{
  $arguments=New-Object object[] 4
  $arguments[0]=[string]($prefix+$url)
  $arguments[1]=[long]1818119
  $arguments[2]=[Threading.CancellationToken]::None
  $arguments[3]=$null
  $bytes=$m.Invoke($null,$arguments)
  $hash=([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes))).Replace('-','').ToLowerInvariant()
  if($hash -ne '15c5dcae2a5a4426a5eda67d44d26243bec17e92c8687c571953f8215f5227f1'){throw 'hash mismatch'}
  $passed++
  Write-Host "TRANSPORT PASS $prefix bytes=$($bytes.Length) ms=$($watch.ElapsedMilliseconds)"
 }catch{
  $e=$_.Exception;while($e.InnerException){$e=$e.InnerException}
  Write-Host "TRANSPORT FAIL $prefix $($e.GetType().FullName) $($e.Message) ms=$($watch.ElapsedMilliseconds)"
 }
}

if($passed -ne 5){throw "Only $passed of 5 routes verified"}
