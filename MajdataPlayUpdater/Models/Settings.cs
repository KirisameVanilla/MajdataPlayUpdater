using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MajdataPlayUpdater.Models;
public class Settings
{
    public string LastOpenedFolder { get; set; } = AppDomain.CurrentDomain.BaseDirectory;
    public string ProxyUrl { get; set; } = "";
}