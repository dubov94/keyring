import os
import json
import subprocess
import threading

import bottle
import maxminddb


def update_and_schedule():
    try:
        subprocess.run(['geoipupdate'],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as error:
        print(error)
    threading.Timer(24 * 60 * 60, update_and_schedule).start()
    

@bottle.route('/get-ip-info/<ip_address>')
def get_ip_info(ip_address):
    return json.dumps(reader.get(ip_address) or {})


update_and_schedule()
# https://maxminddb.readthedocs.io/en/latest/#exceptions.
reader = maxminddb.open_database(
    os.path.join(os.getenv('MMDB_PATH'), 'GeoLite2-City.mmdb'))
bottle.run(host='localhost', port=80)
