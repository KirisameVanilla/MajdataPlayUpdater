using System.Net;
using System.Net.Http;

namespace MajdataPlayUpdater.Models;

public class HttpHelper
{
    public HttpClient Client { get; set; }

    public HttpHelper()
    {
        Client = new HttpClient();
    }

    public void RecreateHttpClientWithProxy(string proxyUrl)
    {
        Client.Dispose();

        if (proxyUrl.Trim() == string.Empty)
        {
            Client = new HttpClient();
        }
        else
        {
            var handler = new HttpClientHandler
            {
                Proxy = new WebProxy(proxyUrl),
                UseProxy = true
            };
            Client = new HttpClient(handler);
        }
    }
}