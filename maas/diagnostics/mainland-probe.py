import json,time,urllib.request,urllib.error
BASE="https://api.globalping.io/v1"
def request(path,data=None):
    req=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers={"Content-Type":"application/json","User-Agent":"Maas-download-validation"})
    with urllib.request.urlopen(req,timeout=45) as r:return json.load(r)
probes=request("/probes")
cn=[p for p in probes if p.get("location",{}).get("country")=="CN"]
print("MAINLAND_PROBE_COUNT",len(cn),flush=True)
print("MAINLAND_LOCATIONS",json.dumps([p.get("location",{}) for p in cn],ensure_ascii=False),flush=True)
if not cn:raise SystemExit("No mainland probes available: mainland validation not performed")
path="/https://github.com/Utopian1025/myvault/releases/download/maas-excel-v0.8.9.15/Maas_Excel_v0.8.9.15.zip"
for host in ["gh-proxy.org","gh-proxy.com","ghfast.top","ghproxy.net"]:
    payload={"type":"http","target":host,"locations":[{"country":"CN"}],"limit":3,"measurementOptions":{"protocol":"HTTPS","request":{"method":"GET","path":path}}}
    try:
        m=request("/measurements",payload)
        print("MEASUREMENT",host,m,flush=True)
        for attempt in range(24):
            result=request("/measurements/"+m["id"])
            if result.get("status")=="finished":break
            time.sleep(3)
        print("MAINLAND_RESULT",host,json.dumps(result,ensure_ascii=False),flush=True)
    except urllib.error.HTTPError as e:print("MEASUREMENT_ERROR",host,e.code,e.read().decode()[:3000],flush=True)
