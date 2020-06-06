import os
import json
import subprocess
import threading

import bottle
import maxminddb


def update_and_schedule():
    try:
        # Expects GEOIPUPDATE_ACCOUNT_ID, GEOIPUPDATE_LICENSE_KEY
        # and GEOIPUPDATE_EDITION_IDS.
        subprocess.run(['/usr/bin/entry.sh'],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as error:
        print(error)
    threading.Timer(24 * 60 * 60, update_and_schedule).start()


@bottle.route('/get-ip-info/<ip_address>')
def get_ip_info(ip_address):
    return json.dumps(reader.get(ip_address) or {})


update_and_schedule()
# https://maxminddb.readthedocs.io/en/latest/#exceptions
reader = maxminddb.open_database(
    # https://github.com/maxmind/geoipupdate/blob/master/docker/entry.sh
    os.path.join('/usr/share/GeoIP', 'GeoLite2-City.mmdb'))
bottle.run(host='0.0.0.0', port=5003)
