import xml.etree.ElementTree as ET
import sys
import os

def fix_manifest(mpd_path, output_path):
    # Register namespace to avoid 'ns0:' prefixes
    ET.register_namespace('', "urn:mpeg:dash:schema:mpd:2011")
    
    tree = ET.parse(mpd_path)
    root = tree.getroot()
    
    # Dash namespace
    ns = {'dash': 'urn:mpeg:dash:schema:mpd:2011'}
    
    # Find the Period
    period = root.find('dash:Period', ns)
    if period is None:
        print("No Period found")
        return
        
    video_sets = []
    
    for adapt_set in period.findall('dash:AdaptationSet', ns):
        if adapt_set.get('contentType') == 'video':
            video_sets.append(adapt_set)
            
    if len(video_sets) > 1:
        # Move all representations from other video sets to the first one
        primary_set = video_sets[0]
        
        for adapt_set in video_sets[1:]:
            for rep in adapt_set.findall('dash:Representation', ns):
                primary_set.append(rep)
            period.remove(adapt_set)
            print(f"Merged AdaptationSet {adapt_set.get('id')} into {primary_set.get('id')}")
            
    # Check if subtitle already exists
    has_sub = False
    for adapt_set in period.findall('dash:AdaptationSet', ns):
        if adapt_set.get('contentType') == 'text':
            has_sub = True
            break
            
    if not has_sub:
        # Add subtitle AdaptationSet
        sub_set = ET.Element('{urn:mpeg:dash:schema:mpd:2011}AdaptationSet')
        sub_set.set('id', '99')
        sub_set.set('contentType', 'text')
        sub_set.set('mimeType', 'text/vtt')
        sub_set.set('lang', 'en')
        
        role = ET.Element('{urn:mpeg:dash:schema:mpd:2011}Role')
        role.set('schemeIdUri', 'urn:mpeg:dash:role:2011')
        role.set('value', 'subtitle')
        sub_set.append(role)
        
        rep = ET.Element('{urn:mpeg:dash:schema:mpd:2011}Representation')
        rep.set('id', 'sub_en')
        rep.set('bandwidth', '256')
        
        base_url = ET.Element('{urn:mpeg:dash:schema:mpd:2011}BaseURL')
        base_url.text = 'subtitle_en.vtt'
        rep.append(base_url)
        
        sub_set.append(rep)
        period.append(sub_set)
        print("Added Subtitle AdaptationSet")
        
    tree.write(output_path, encoding='utf-8', xml_declaration=True)
    print(f"Saved fixed manifest to {output_path}")

if __name__ == '__main__':
    fix_manifest(r"E:\NeatDownload\New folder\output\dash\manifest.mpd", r"E:\NeatDownload\New folder\output\dash\manifest_fixed.mpd")
