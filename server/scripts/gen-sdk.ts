import { generateApi } from 'swagger-typescript-api';
import path from 'path';

const targets: Record<string, { url: string; output: string }> = {
  admin: {
    url: 'http://localhost:3001/docs-json',
    output: path.resolve(__dirname, '../../admin-web/src/services/api/generated'),
  },
  client: {
    url: 'http://localhost:3000/docs-json',
    output: path.resolve(__dirname, '../../client-taro/src/services/api/generated'),
  },
};

async function main() {
  const target = process.argv[2];

  if (!target || !targets[target]) {
    console.error('Usage: ts-node gen-sdk.ts <admin|client>');
    process.exit(1);
  }

  const config = targets[target];

  console.log(`Generating ${target} SDK from ${config.url}...`);

  try {
    await generateApi({
      fileName: 'api.ts',
      output: config.output,
      url: config.url,
      generateClient: true,
      generateRouteTypes: false,
      generateResponses: true,
      unwrapResponseData: false,
      defaultResponseAsSuccess: false,
      sortTypes: true,
      sortRoutes: true,
      extractRequestParams: false,
      extractRequestBody: false,
      extractEnums: true,
      modular: false,
      singleHttpClient: true,
    });

    console.log(`SDK generated at ${config.output}`);
  } catch (error) {
    console.error(`Failed to generate SDK:`, error);
    console.log('Make sure the API server is running (pnpm dev:admin-api or pnpm dev:client-api)');
    process.exit(1);
  }
}

main();
