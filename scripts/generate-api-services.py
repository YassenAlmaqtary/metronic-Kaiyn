"""Generate Angular API services from swagger.json."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(r'd:\metronic-tailwind-angular')
SWAGGER = ROOT / 'swagger.json'
OUT_DIR = ROOT / 'src' / 'app' / 'core' / 'api' / 'generated'

HTTP_METHODS = {'get', 'post', 'put', 'patch', 'delete'}


def pascal_case(value: str) -> str:
    parts = re.split(r'[^a-zA-Z0-9]+', value)
    return ''.join(p[:1].upper() + p[1:] for p in parts if p)


def camel_case(value: str) -> str:
    pascal = pascal_case(value)
    return pascal[:1].lower() + pascal[1:] if pascal else 'call'


def tag_to_file(tag: str) -> str:
    name = re.sub(r'(?<!^)(?=[A-Z])', '-', tag).lower()
    return f'{name}-api.service.ts'


def tag_to_class(tag: str) -> str:
    return f'{pascal_case(tag)}ApiService'


def path_params(path: str) -> list[str]:
    return re.findall(r'\{([^}]+)\}', path)


def method_name(path: str, http_method: str, index: int) -> str:
    params = path_params(path)
    static_parts = [p for p in path.replace('/api/', '').split('/') if not p.startswith('{')]
    suffix = ''.join(pascal_case(p) for p in static_parts[1:]) if len(static_parts) > 1 else ''
    prefix = {
        'get': 'get',
        'post': 'create',
        'put': 'update',
        'patch': 'patch',
        'delete': 'delete',
    }[http_method]

    if http_method == 'get':
        if not suffix and not params:
            name = 'getAll'
        elif len(params) == 1 and not suffix:
            name = f'getBy{pascal_case(params[0])}'
        else:
            name = f'get{suffix}' if suffix else 'get'
            if params:
                name += 'By' + ''.join(pascal_case(p) for p in params)
    elif http_method == 'post':
        name = f'post{suffix}' if suffix else 'create'
    elif http_method == 'put':
        name = f'update{suffix}' if suffix else 'update'
    elif http_method == 'patch':
        name = f'patch{suffix}' if suffix else 'patch'
    else:
        name = f'delete{suffix}' if suffix else 'delete'
        if params:
            name += 'By' + ''.join(pascal_case(p) for p in params)

    return camel_case(name) if not name[0].islower() else name


def has_request_body(op: dict) -> bool:
    return bool(op.get('requestBody'))


def build_signature(path: str, http_method: str, op: dict) -> tuple[str, str, list[str]]:
    params = path_params(path)
    args: list[str] = []
    call_args: list[str] = []

    for p in params:
        ts_type = 'number' if p.lower().endswith('id') else 'string'
        args.append(f'{camel_case(p)}: {ts_type}')
        call_args.append(camel_case(p))

    if has_request_body(op):
        args.append('body: unknown')
        call_args.append('body')

    query_params = []
    for param in op.get('parameters', []):
        if param.get('in') == 'query':
            qn = param['name']
            schema = param.get('schema', {})
            ts_type = 'number' if schema.get('type') == 'integer' else 'string'
            args.append(f'{camel_case(qn)}?: {ts_type}')
            query_params.append(qn)

    name = method_name(path, http_method, 0)
    arg_str = ', '.join(args)
    return name, arg_str, call_args


def render_method(path: str, http_method: str, op: dict, used_names: set[str]) -> str:
    name, arg_str, call_args = build_signature(path, http_method, op)
    base_name = name
    counter = 2
    while name in used_names:
        name = f'{base_name}{counter}'
        counter += 1
    used_names.add(name)

    params = path_params(path)
    path_expr = '`' + path.replace('{', '${') + '`'
    if params:
        mapping = ', '.join(f'{camel_case(p)}' for p in params)
        path_build = f'toApiPath(`{path}`, {{ {", ".join(f"{camel_case(p)}: {camel_case(p)}" for p in params)} }})'
    else:
        path_build = f"'{path}'"

    http_fn = http_method
    if has_request_body(op):
        body_arg = 'body' if 'body: unknown' in arg_str else 'null'
        call = f"this.http.{http_fn}<ApiResponse<unknown>>(buildApiUrl({path_build}), {body_arg})"
    elif http_method in ('post', 'put', 'patch') and not has_request_body(op):
        call = f"this.http.{http_fn}<ApiResponse<unknown>>(buildApiUrl({path_build}), null)"
    else:
        call = f"this.http.{http_fn}<ApiResponse<unknown>>(buildApiUrl({path_build}))"

    args_display = f'({arg_str})' if arg_str else '()'
    return f"  {name}{args_display} {{\n    return {call};\n  }}\n"


def main() -> None:
    spec = json.loads(SWAGGER.read_text(encoding='utf-8'))
    grouped: dict[str, list[tuple[str, str, dict]]] = defaultdict(list)

    for path, ops in spec['paths'].items():
        for method, op in ops.items():
            if method not in HTTP_METHODS:
                continue
            tag = (op.get('tags') or ['General'])[0]
            grouped[tag].append((path, method, op))

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    exports: list[str] = []

    for tag in sorted(grouped):
        class_name = tag_to_class(tag)
        file_name = tag_to_file(tag)
        used_names: set[str] = set()
        methods = []
        for path, method, op in sorted(grouped[tag], key=lambda x: (x[0], x[1])):
            methods.append(render_method(path, method, op, used_names))

        content = f"""import {{ HttpClient }} from '@angular/common/http';
import {{ Injectable, inject }} from '@angular/core';
import {{ Observable }} from 'rxjs';

import {{ buildApiUrl, toApiPath }} from '../api-url';
import {{ ApiResponse }} from '../models/api-response.model';

/** Generated from Swagger tag: {tag} */
@Injectable({{ providedIn: 'root' }})
export class {class_name} {{
  private http = inject(HttpClient);

{chr(10).join(methods)}}}
"""
        (OUT_DIR / file_name).write_text(content, encoding='utf-8')
        exports.append(f"export {{ {class_name} }} from './{file_name.replace('.ts', '')}';")

    (OUT_DIR / 'index.ts').write_text('\n'.join(exports) + '\n', encoding='utf-8')
    print(f'Generated {len(grouped)} services in {OUT_DIR}')


if __name__ == '__main__':
    main()
