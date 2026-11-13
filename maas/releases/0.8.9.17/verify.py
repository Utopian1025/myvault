import base64,hashlib,json,pathlib,zipfile
root=pathlib.Path("maas/releases/0.8.9.17")
manifest=json.loads((root/"manifest.json").read_text())
assert manifest["version"]=="0.8.9.17"
out=pathlib.Path("out");out.mkdir(exist_ok=True)
for entry in manifest["files"]:
 assert entry["name"] in ("Maas_Excel_v0.8.9.17.zip","Maas_0.8.9.17_Promotion.zip")
 chunks=[]
 for index in range(entry["parts"]):
  chunks.append((root/(entry["prefix"]+str(index).zfill(3)+".b64")).read_text().strip())
 data=base64.b64decode("".join(chunks),validate=True)
 assert len(data)==entry["bytes"]
 assert hashlib.sha256(data).hexdigest()==entry["sha256"].lower()
 target=out/entry["name"];target.write_bytes(data)
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None
  names={n.replace("\\","/") for n in z.namelist() if not n.endswith("/")}
  if entry["name"].startswith("Maas_Excel"):
   assert names=={"Maas_Excel.exe","Data/Maas.xlam","Data/Maas.Navigation.dll","Data/Maas.Maintenance.exe","README.md","SHA256SUMS.txt"},names
  else:
   assert len(names)==8 and all("/" not in n and not n.startswith(".") and n.endswith((".png",".txt")) for n in names)
 print(entry["name"],len(data),entry["sha256"])

installer=next(item for item in manifest["files"] if item["name"].startswith("Maas_Excel"))
(out/"Maas_Excel_v0.8.9.17.sha256.txt").write_text(installer["sha256"]+"  "+installer["name"]+"\n")
