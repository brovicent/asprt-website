import re

def fix_vtt(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find timestamp lines like: 00:51.328 --> 00:55.268 or 00:00:01.000 --> 00:00:03.000
    # and append line:80% if not already there
    def replace_line(match):
        line_content = match.group(0)
        if 'line:' not in line_content:
            return line_content + ' line:80%'
        return line_content

    # Regex to match the timestamp line, making hours optional
    pattern = re.compile(r'(\d{2}:)?\d{2}:\d{2}\.\d{3} --> (\d{2}:)?\d{2}:\d{2}\.\d{3}.*')
    new_content = pattern.sub(replace_line, content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Fixed VTT at {path}")

if __name__ == '__main__':
    fix_vtt(r"E:\NeatDownload\New folder\output\dash\subtitle_en.vtt")
