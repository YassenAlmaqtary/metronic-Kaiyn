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


def parameter_type(schema: dict) -> str:
    schema_type = schema.get('type')
    if schema_type == 'array':
        return f'{parameter_type(schema.get("items", {}))}[]'
    return {
        'boolean': 'boolean',
        'integer': 'number',
        'number': 'number',
    }.get(schema_type, 'string')


def operation_parameters(path_item: dict, op: dict) -> list[dict]:
    parameters: dict[tuple[str, str], dict] = {}
    for parameter in [*path_item.get('parameters', []), *op.get('parameters', [])]:
        parameters[(parameter.get('name', ''), parameter.get('in', ''))] = parameter
    return list(parameters.values())


def build_signature(
    path: str,
    http_method: str,
    op: dict,
    parameters: list[dict],
) -> tuple[str, str, list[tuple[str, str]]]:
    params = path_params(path)
    args: list[str] = []
    parameters_by_location = {
        (parameter.get('in'), parameter.get('name')): parameter
        for parameter in parameters
    }

    for p in params:
        parameter = parameters_by_location.get(('path', p), {})
        schema = parameter.get('schema')
        ts_type = (
            parameter_type(schema)
            if schema
            else 'number' if p.lower().endswith('id') else 'string'
        )
        args.append(f'{camel_case(p)}: {ts_type}')

    if has_request_body(op):
        args.append('body: unknown')

    query_params: list[tuple[str, str]] = []
    query_parameters = [param for param in parameters if param.get('in') == 'query']
    query_parameters.sort(key=lambda param: not param.get('required', False))
    for param in query_parameters:
        query_name = param['name']
        schema = param.get('schema', {})
        ts_type = parameter_type(schema)
        optional = '' if param.get('required') else '?'
        args.append(f'{camel_case(query_name)}{optional}: {ts_type}')
        query_params.append((query_name, camel_case(query_name)))

    name = method_name(path, http_method, 0)
    arg_str = ', '.join(args)
    return name, arg_str, query_params


def render_method(
    path: str,
    http_method: str,
    op: dict,
    parameters: list[dict],
    used_names: set[str],
) -> str:
    name, arg_str, query_params = build_signature(path, http_method, op, parameters)
    base_name = name
    counter = 2
    while name in used_names:
        name = f'{base_name}{counter}'
        counter += 1
    used_names.add(name)

    path_params_list = path_params(path)
    if path_params_list:
        path_build = (
            f'toApiPath(`{path}`, '
            f'{{ {", ".join(f"{camel_case(p)}: {camel_case(p)}" for p in path_params_list)} }})'
        )
    else:
        path_build = f"'{path}'"

    http_fn = http_method
    options_arg = ''
    if query_params:
        query_build = '\n'.join(
            f"    if ({argument_name} != null) {{\n"
            f"      for (const value of Array.isArray({argument_name}) ? {argument_name} : [{argument_name}]) {{\n"
            f"        params = params.append('{query_name}', String(value));\n"
            f"      }}\n"
            f"    }}"
            for query_name, argument_name in query_params
        )
        options_arg = f", {{ params }}"
        params_setup = f"    let params = new HttpParams();\n{query_build}\n"
    else:
        params_setup = ''

    if has_request_body(op):
        call = (
            f"this.http.{http_fn}<ApiResponse<unknown>>("
            f"buildApiUrl({path_build}), body{options_arg})"
        )
    elif http_method in ('post', 'put', 'patch') and not has_request_body(op):
        call = (
            f"this.http.{http_fn}<ApiResponse<unknown>>("
            f"buildApiUrl({path_build}), null{options_arg})"
        )
    else:
        call = f"this.http.{http_fn}<ApiResponse<unknown>>("
        call += f"buildApiUrl({path_build}){options_arg})"

    args_display = f'({arg_str})' if arg_str else '()'
    return (
        f"  {name}{args_display} {{\n"
        f"{params_setup}"
        f"    return {call};\n"
        f"  }}\n"
    )


def main() -> None:
    spec = json.loads(SWAGGER.read_text(encoding='utf-8'))
    grouped: dict[str, list[tuple[str, str, dict, dict]]] = defaultdict(list)

    for path, ops in spec['paths'].items():
        for method, op in ops.items():
            if method not in HTTP_METHODS:
                continue
            tag = (op.get('tags') or ['General'])[0]
            grouped[tag].append((path, method, op, ops))

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    exports: list[str] = []

    for tag in sorted(grouped):
        class_name = tag_to_class(tag)
        file_name = tag_to_file(tag)
        used_names: set[str] = set()
        methods = []
        for path, method, op, path_item in sorted(grouped[tag], key=lambda x: (x[0], x[1])):
            parameters = operation_parameters(path_item, op)
            methods.append(render_method(path, method, op, parameters, used_names))

        has_query_params = any(
            parameter.get('in') == 'query'
            for _, _, op, path_item in grouped[tag]
            for parameter in operation_parameters(path_item, op)
        )
        http_imports = 'HttpClient, HttpParams' if has_query_params else 'HttpClient'
        content = f"""import {{ {http_imports} }} from '@angular/common/http';
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
